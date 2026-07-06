import {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    EncodedAudioPacketSource,
    EncodedPacketSink,
    Input,
    Mp4OutputFormat,
    Output
} from 'mediabunny';

/**
 * Extracts the primary audio track from a video/audio file.
 *
 * Returns the raw encoded audio packets muxed into an MP4 container (AAC
 * passthrough). If the audio codec is not supported by MP4, the function
 * throws a descriptive error so the caller can surface it to the user.
 *
 * @param {File} file - The source video/audio file.
 * @param {{ onProgress?: (info: {packetCount: number}) => void }} [options]
 * @returns {Promise<{
 *   blob: Blob,
 *   codec: string|null,
 *   packetCount: number,
 *   mimeType: string
 * }>}
 */
export async function extractAudioTrack(file, { onProgress } = {}) {
    const notify = typeof onProgress === 'function' ? onProgress : () => {};

    const input = new Input({
        source: new BlobSource(file),
        formats: ALL_FORMATS
    });

    try {
        // ── locate audio track ─────────────────────────────────────────────
        const audioTrack = await input.getPrimaryAudioTrack().catch(() => null);
        if (!audioTrack) {
            throw new Error('No audio track found in this file.');
        }

        const codec = await audioTrack.getCodec().catch(() => null);
        const format = new Mp4OutputFormat();

        // Check whether this codec can be muxed into MP4 directly
        const supportedCodecs = format.getSupportedAudioCodecs();
        if (!codec || !supportedCodecs.includes(codec)) {
            throw new Error(
                `Audio codec "${codec || 'unknown'}" cannot be extracted to MP4. ` +
                'The source audio must be AAC to extract to MP4.'
            );
        }

        // ── build output (audio-only MP4) ──────────────────────────────────
        const target = new BufferTarget();
        const output = new Output({ format, target });

        const audioSource = new EncodedAudioPacketSource(codec);
        output.addAudioTrack(audioSource);

        const decoderConfig = await audioTrack.getDecoderConfig().catch(() => null);
        const meta = { decoderConfig: decoderConfig ?? undefined };

        // Get the first timestamp to normalize packet times
        const startTimestamp = await audioTrack.getFirstTimestamp().catch(() => 0);

        await output.start();

        let packetCount = 0;
        const targetDuration = (options?.loopEnabled && options?.loopDurationSeconds > 0)
            ? Number(options.loopDurationSeconds)
            : Infinity;
        let currentTotalTime = 0;
        let cycleCount = 0;

        try {
            while (currentTotalTime < targetDuration) {
                const sink = new EncodedPacketSink(audioTrack);
                let cycleDuration = 0;

                for await (const packet of sink.packets()) {
                    const shiftedTs = packet.timestamp - startTimestamp;
                    let normTs = 0;
                    let normDur = packet.duration;

                    if (shiftedTs < 0) {
                        if (packet.timestamp + packet.duration <= startTimestamp) continue;
                        normDur = Math.max(0, packet.duration + shiftedTs);
                    } else {
                        normTs = shiftedTs;
                    }

                    const finalTs = currentTotalTime + normTs;
                    if (finalTs >= targetDuration) break;

                    const finalDur = Math.min(normDur, targetDuration - finalTs);
                    const pkt = packet.clone({
                        timestamp: finalTs,
                        duration: finalDur
                    });
                    await audioSource.add(pkt, meta);
                    packetCount++;
                    if (packetCount % 50 === 0) notify({ packetCount });

                    cycleDuration = Math.max(cycleDuration, normTs + normDur);
                }

                if (cycleDuration <= 0 || !options?.loopEnabled) break;
                currentTotalTime += cycleDuration;
                cycleCount++;
                if (cycleCount >= 10000) break; // safety limit (supports e.g. 24 hours of short loops)
            }
        } finally {
            audioSource.close();
        }

        await output.finalize();

        if (!target.buffer) {
            throw new Error('Audio extraction produced empty output.');
        }

        notify({ packetCount });

        const mimeType = 'audio/mp4';
        return {
            blob: new Blob([target.buffer], { type: mimeType }),
            codec,
            packetCount,
            mimeType
        };
    } finally {
        input.dispose();
    }
}
