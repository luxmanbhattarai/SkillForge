import json

def grade(case, answer, citations):
    if case.get("expected_behavior") == "abstain":
        return "don't know" in answer.lower()
    ok = all(s in answer for s in case.get("expected_contains", []))
    if case.get("must_cite"):
        ok = ok and len(citations) > 0
    return ok

def run_suite(cases_path, run_system):
    cases = [json.loads(line) for line in open(cases_path)]
    results = []
    for case in cases:
        answer, citations = run_system(case["input"])
        results.append(grade(case, answer, citations))
    passed = sum(results)
    print(f"{passed}/{len(results)} passed ({passed / len(results):.0%})")
    return passed / len(results)
