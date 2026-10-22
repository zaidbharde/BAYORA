# Phase 12 dataset source notes

## JailbreakBench JBB-Behaviors

The official repository describes two aligned subsets: 100 harmful behaviors and 100 thematically similar benign behaviors. The behavior dataset includes `Behavior`, `Goal`, `Target`, `Category`, and `Source`; it contains goals/behaviors, not a universal set of attack strings. Use the `Goal` as the evaluation input and keep the harmful subset disjoint from the benign false-positive sample where required. The dataset card lists an MIT license and DOI `10.57967/hf/2540`. The NeurIPS 2024 paper describes a benchmark with 100 behaviors and standardized evaluation tooling. The Hugging Face API reported revision `886acc352a31533ffbcf4ef22c744658688086fc` (last modified 2024-09-26). Preserve the benchmark name, subset, source commit/revision, file SHA-256, and local transformation/seed in the results metadata. Do not describe the tiny local `safe_smoke.jsonl` as a benchmark.

Sources:

- [1] Official project documentation: https://github.com/JailbreakBench/jailbreakbench
- [2] Official dataset card and files: https://huggingface.co/datasets/JailbreakBench/JBB-Behaviors
- [3] NeurIPS 2024 paper abstract: https://proceedings.neurips.cc/paper_files/paper/2024/hash/63092d79154adebd7305dfd498cbff70-Abstract-Datasets_and_Benchmarks_Track.html
- At the pinned revision, in-memory checks found 100 rows each in the harmful and benign CSVs. SHA-256: harmful `4a8ec6832056b631eb092dccc60d37a61c3d441268268888b3d006288afeffa1`; benign `3cda234d21a991fa309bbfea4b6d9dae31ccdf8e9d452424b6a983e4fdc33468`; judge-comparison (300 rows) `dacaf76a1057785f11b0fc6aa07b9a73cdab588319ddfc5e8cef2909e5b112a5`.
- Official JBB classifier documentation says its boolean result is `True` when a response is classified as jailbroken; its string baseline uses refusal-prefix matching. The local evaluator will keep refusal detection and a separately documented local harmfulness classifier distinct, and will validate label handling against the human-majority rows.
- [4] Official classifier source: https://raw.githubusercontent.com/JailbreakBench/jailbreakbench/main/src/jailbreakbench/classifier.py

## Handling

JBB harmful goals may elicit unsafe model output. Do not print prompt or response plaintext; keep source and result material in the existing host-only encrypted-bundle / tenant-tmpfs workflow, and retain only hashes and aggregate labels in the signed Audit log. The hand-check sample must also avoid printing the judged text. The 0.5B local model and toy Blue classifier are not representative of production systems; report results as a bounded, local benchmark experiment, not a general safety guarantee.
