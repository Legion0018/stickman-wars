/**
 * Stickman Wars - Python Lesson Proof of Concept (Web Worker)
 * 
 * Runs Pyodide in an isolated worker thread.
 * Untrusted code is evaluated inside a dedicated Python dictionary scope.
 * No DOM, game state, or combat variables are exposed to this worker.
 */

/* global importScripts, loadPyodide */

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodideInstance = null;
let isInitializing = false;

// Python validation harness
const VALIDATION_HARNESS = `
def _validate_special_attack(user_code_str):
    scope = {}
    
    # 1. Compile and execute user code
    try:
        compiled = compile(user_code_str, "<submission>", "exec")
        exec(compiled, scope)
    except SyntaxError as e:
        return {
            "passed": False,
            "error_type": "SyntaxError",
            "error_message": f"SyntaxError on line {e.lineno}: {e.msg}\\n  {e.text or ''}",
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
    if "special_attack" not in scope or not callable(scope["special_attack"]):
        return {
            "passed": False,
            "error_type": "DefinitionError",
            "error_message": "Function 'special_attack(power, energy)' was not defined.",
            "details": []
        }

    func = scope["special_attack"]

    # 3. Trusted test cases: (power, energy, expected_output)
    test_cases = [
        (8, 12, 16),
        (8, 5, 0),
        (0, 12, 0)
    ]

    details = []
    all_passed = True
    first_runtime_error_type = None
    first_runtime_error_msg = None

    for power, energy, expected in test_cases:
        case_info = {
            "input": f"special_attack({power}, {energy})",
            "expected": expected,
            "actual": None,
            "passed": False,
            "error": None
        }
        try:
            actual = func(power, energy)
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
`;

async function initPyodide() {
  if (pyodideInstance) return pyodideInstance;

  if (isInitializing) {
    while (isInitializing) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return pyodideInstance;
  }

  isInitializing = true;
  postMessage({
    type: 'STATUS',
    status: 'loading',
    message: `Loading Pyodide v${PYODIDE_VERSION} from CDN...`
  });

  try {
    importScripts(`${PYODIDE_CDN_BASE}pyodide.js`);
    pyodideInstance = await loadPyodide({
      indexURL: PYODIDE_CDN_BASE
    });

    // Register Python validator function
    pyodideInstance.runPython(VALIDATION_HARNESS);

    isInitializing = false;
    postMessage({
      type: 'STATUS',
      status: 'ready',
      message: 'Pyodide runtime initialized successfully.'
    });
    return pyodideInstance;
  } catch (err) {
    isInitializing = false;
    postMessage({
      type: 'STATUS',
      status: 'error',
      message: `Failed to load Pyodide: ${err.message}`
    });
    throw err;
  }
}

self.onmessage = async (event) => {
  const { id, type, code } = event.data || {};

  if (type === 'INIT') {
    try {
      await initPyodide();
    } catch (err) {
      postMessage({ id, type: 'ERROR', error: err.message });
    }
    return;
  }

  if (type === 'RUN') {
    try {
      const py = await initPyodide();

      const validator = py.globals.get('_validate_special_attack');
      const pyResult = validator(code);
      const jsResult = pyResult.toJs({ dict_converter: Object.fromEntries });
      pyResult.destroy();

      postMessage({
        id,
        type: 'RESULT',
        result: jsResult
      });
    } catch (err) {
      postMessage({
        id,
        type: 'RESULT',
        result: {
          passed: false,
          error_type: 'ExecutionError',
          error_message: err.message,
          details: []
        }
      });
    }
  }
};
