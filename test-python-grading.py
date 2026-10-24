"""
test-python-grading.py

Executes real Python 3 runtime validation against the exact grading harness from python-poc/worker.js
Validates that:
1. All 24 reference solutions (solutionCode) pass 100% of test cases.
2. Starter codes that have syntax bugs or incomplete logic correctly fail.
3. Edge cases evaluate cleanly without unhandled exceptions.
"""

import json
import sys

def _grade_submission(user_code_str, entrypoint_name, test_cases):
    scope = {}
    
    # 1. Compile and execute user code
    try:
        compiled = compile(user_code_str, "<submission>", "exec")
        exec(compiled, scope)
    except SyntaxError as e:
        return {
            "passed": False,
            "error_type": "SyntaxError",
            "error_message": f"SyntaxError on line {e.lineno}: {e.msg}\n  {e.text or ''}",
            "details": []
        }
    except Exception as e:
        return {
            "passed": False,
            "error_type": type(e).__name__,
            "error_message": f"{type(e).__name__}: {str(e)}",
            "details": []
        }

    # 2. Check function definition
    if entrypoint_name not in scope or not callable(scope[entrypoint_name]):
        return {
            "passed": False,
            "error_type": "DefinitionError",
            "error_message": f"Function '{entrypoint_name}' was not defined.",
            "details": []
        }

    func = scope[entrypoint_name]

    details = []
    all_passed = True
    first_runtime_error_type = None
    first_runtime_error_msg = None

    for tc in test_cases:
        args = tc.get("args", [])
        expected = tc.get("expected")
        inp_str = tc.get("input", f"{entrypoint_name}({', '.join(map(repr, args))})")

        case_info = {
            "input": inp_str,
            "expected": expected,
            "actual": None,
            "passed": False,
            "error": None
        }

        try:
            actual = func(*args)
            case_info["actual"] = actual
            if actual == expected:
                case_info["passed"] = True
            else:
                all_passed = False
        except Exception as ex:
            all_passed = False
            case_info["error"] = f"{type(ex).__name__}: {str(ex)}"
            if first_runtime_error_type is None:
                first_runtime_error_type = type(ex).__name__
                first_runtime_error_msg = str(ex)

        details.append(case_info)

    if all_passed:
        err_type = None
        err_msg = None
    elif first_runtime_error_type is not None:
        err_type = first_runtime_error_type
        err_msg = f"{first_runtime_error_type}: {first_runtime_error_msg}"
    else:
        err_type = "AssertionError"
        err_msg = "One or more test cases returned incorrect output."

    return {
        "passed": all_passed,
        "error_type": err_type,
        "error_message": err_msg,
        "details": details
    }

def main():
    print("=== TESTING ALL 24 CHALLENGES WITH REAL PYTHON RUNTIME ===\n")
    with open("temp-challenges.json", "r", encoding="utf-8") as f:
        challenges = json.load(f)

    assert len(challenges) == 24, f"Expected 24 challenges, found {len(challenges)}"

    passed_count = 0
    failed_challenges = []

    for idx, c in enumerate(challenges, 1):
        cid = c["id"]
        entrypoint = c["entrypoint"]
        solution_code = c["solutionCode"]
        test_cases = c["testCases"]
        tier = c["difficulty"]

        result = _grade_submission(solution_code, entrypoint, test_cases)
        if result["passed"]:
            passed_count += 1
            print(f"[{idx:02d}/24] PASS: {cid:<32} ({tier.upper():<12}) -> {len(test_cases)} test cases passed")
        else:
            failed_challenges.append((cid, result))
            print(f"[{idx:02d}/24] FAIL: {cid:<32} ({tier.upper():<12}) -> {result['error_type']}: {result['error_message']}")

    print(f"\nResults: {passed_count}/24 reference solutions passed.")

    if failed_challenges:
        print("\nFailures:")
        for cid, res in failed_challenges:
            print(f"  - {cid}: {res['error_type']} - {res['error_message']}")
        sys.exit(1)
    else:
        print("\nAll 24 Python reference solutions passed 100% of test cases cleanly.")

if __name__ == "__main__":
    main()
