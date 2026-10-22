# Phase 10 requirements (from attached Master Build Prompt)

Source: `BAYORA_Master_Build_Prompt.pdf`, Parts 6.2 (p. 7), 11 (p. 11), 14 (pp. 12–13), and 16 (p. 14); extracted text is `/tmp/text_editor_extracts/BAYORA_Master_Build_Prompt-23f2dd4e987f-p1-17.txt`.

- **Gateway timing (Part 6.2):** wait until the next configured bucket boundary before replying; log raw and padded latency internally. The example bucket set is 250, 500, 1000, 2000, 5000 ms.
- **T11 (Part 14):** compare allowed, rule-blocked, classifier-blocked, and output-filtered latency distributions; they should be indistinguishable after bucketing (example KS p > 0.05).
- **T14 (Part 14):** run a noisy-neighbor experiment; resource interference must remain within tolerance.
- **Phase 10 acceptance (Part 16):** T11 and T14 pass before Phase 11 starts.
- **Threat-to-control mapping (Part 14):** timing/fairness controls include bucket padding, cpuset pinning, and cgroup limits. The current stack already has per-service CPU/memory/PID quotas; Phase 10 must test their effect rather than claim guarantees beyond evidence.

Phase 9 measured roughly 1.47–1.49 s median Gateway response latency in the no-padding test. The first Phase 10 run disproved the 2000 ms choice: measured allowed-request raw latency was 2349–2815 ms (median about 2602 ms), rule/classifier blocks were 28–50 ms, and the output path straddled 2000 ms. T11 therefore failed because allowed/rule/classifier responses landed in different buckets. The configured bucket is now 5000 ms, one of the prompt's examples; verify all four classes actually share it before acceptance. The longer bucket has a material throughput cost that must also be checked against the 100-attempt regression.
