# Blue Engine

The Blue service exposes only `POST /check_input` and `POST /check_output` plus health. Requests contain an opaque request ID, direction and one in-flight text. Responses contain exactly `verdict`, `reason_code`, and `sanitized_text`; verdicts and reason codes are fixed enums. The service suppresses access logs and holds no prompt data on disk.

The included TF-IDF/logistic-regression classifier is deliberately a harmless smoke-test classifier trained at startup on policy-evasion meta-instructions and benign text, not a calibrated safety model or a disjoint public research corpus. Its behavior is supplementary to deterministic rules. Replace/retrain it from a vetted public dataset before making evaluation claims; do not interpret its scores as safety assurance.
