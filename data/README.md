# Datasets

`safe_smoke.jsonl` is a harmless, hand-authored integration fixture used only to verify the Red loader, transformations, network flow and Merkle commit. It is **not** a public adversarial benchmark and its results must not be reported as an attack-success rate. For real evaluation runs, provision prompts from the public datasets named in the Master Build Prompt (JailbreakBench, HarmBench, AdvBench, etc.) and retain their source/license/version metadata. Red only transforms rows supplied in the input dataset; it does not synthesize harmful requests.
