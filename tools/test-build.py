"""Build regressions using stdlib fixtures; run with python -I tools/test-build.py."""
import contextlib
import hashlib
import io
import runpy
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "tools/build.ps1"
SHARE_IMAGE = ROOT / "tools/make-share-image.ps1"
OUTPUTS = ("index.html", "404.html")


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="optika-mila-build-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        for directory in ("src", "js", "img"):
            (self.root / directory).mkdir()
        for name in ("site.css", "index.template.html", "404.template.html", "eye.svg", "phone.svg"):
            shutil.copyfile(ROOT / "src" / name, self.root / "src" / name)
        shutil.copyfile(ROOT / "js/script.js", self.root / "js/script.js")

    def run_script(self, script=BUILD, *args, success=True):
        result = subprocess.run(["pwsh", "-NoProfile", "-File", str(script), "-Root", str(self.root), *args], capture_output=True, text=True, encoding="utf-8", timeout=30, cwd=ROOT.parent)
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, "expected a rejected build")
        return result

    def output_state(self):
        return {name: ((self.root / name).read_bytes(), (self.root / name).stat().st_mtime_ns) for name in OUTPUTS}

    def test_build_is_utf8_deterministic_and_noop(self):
        first = self.run_script()
        before = self.output_state()
        second = self.run_script()
        self.assertEqual(before, self.output_state())
        self.assertIn("Unchanged", second.stdout)
        for name, (data, _) in before.items():
            self.assertFalse(data.startswith(b"\xef\xbb\xbf"))
            self.assertTrue(data.endswith(b"\n"))
            self.assertIn("Petra Bojovića bb", data.decode("utf-8"))
            self.assertIn(f"{name} ({len(data)} bytes)", first.stdout)

    def test_check_accepts_clean_outputs_without_writing(self):
        self.run_script()
        before = self.output_state()
        result = self.run_script(BUILD, "-Check")
        self.assertIn("no files written", result.stdout)
        self.assertEqual(before, self.output_state())

    def test_check_rejects_drift_without_writing(self):
        self.run_script()
        (self.root / "index.html").write_bytes(b"stale output\n")
        before = self.output_state()
        result = self.run_script(BUILD, "-Check", success=False)
        self.assertIn("Generated output differs", result.stderr)
        self.assertEqual(before, self.output_state())

    def test_check_does_not_create_missing_outputs(self):
        self.run_script(BUILD, "-Check", success=False)
        self.assertTrue(all(not (self.root / name).exists() for name in OUTPUTS))

    def test_invalid_second_template_preserves_both_outputs(self):
        self.run_script()
        before = self.output_state()
        css = self.root / "src/site.css"
        css.write_text(css.read_text(encoding="utf-8") + "\nbody{color:red;}\n", encoding="utf-8")
        template = self.root / "src/404.template.html"
        template.write_text(template.read_text(encoding="utf-8") + "{{UNKNOWN_PART}}", encoding="utf-8")
        result = self.run_script(success=False)
        self.assertIn("Unresolved template placeholder in 404", result.stderr)
        self.assertEqual(before, self.output_state())

    def test_duplicate_style_placeholder_preserves_outputs(self):
        self.run_script()
        before = self.output_state()
        template = self.root / "src/404.template.html"
        template.write_text(template.read_text(encoding="utf-8").replace("{{STYLES}}", "{{STYLES}}{{STYLES}}"), encoding="utf-8")
        self.run_script(success=False)
        self.assertEqual(before, self.output_state())

    def test_script_hash_updates_both_pages(self):
        self.run_script()
        script = self.root / "js/script.js"
        old_hash = hashlib.sha256(script.read_bytes()).hexdigest()[:12]
        script.write_bytes(script.read_bytes() + b"\n// isolated test fixture\n")
        new_hash = hashlib.sha256(script.read_bytes()).hexdigest()[:12]
        self.run_script()
        for name in OUTPUTS:
            text = (self.root / name).read_text(encoding="utf-8")
            self.assertIn(f"/js/script.js?v={new_hash}", text)
            self.assertNotIn(f"/js/script.js?v={old_hash}", text)

    def test_css_strings_urls_and_significant_spaces_are_preserved(self):
        css = r'''/* remove outside strings */
.a :is(p, a){width:calc(100% - 16px);content:"quoted /* keep double */";}
.b::after{content:'quoted /* keep single */';}
.c{content:"escaped \" /* keep escaped */";}
.d{background:url("data:image/svg+xml,%3Csvg%3E/* keep URI */%3C/svg%3E");}
.e{background:url(data:text/plain,/*keep-raw-uri*/);}
/* remove trailing comment */'''
        (self.root / "src/site.css").write_text(css, encoding="utf-8")
        self.run_script()
        for name in OUTPUTS:
            text = (self.root / name).read_text(encoding="utf-8")
            for preserved in (".a :is(p, a)", "calc(100% - 16px)", "/* keep double */", "/* keep single */", "/* keep escaped */", "/* keep URI */", "/*keep-raw-uri*/"):
                self.assertIn(preserved, text)
            self.assertNotIn("remove outside", text)
            self.assertNotIn("remove trailing", text)

    @unittest.skipUnless(sys.platform == "win32", "System.Drawing generator requires Windows")
    def test_share_image_generation_refuses_accidental_overwrite(self):
        shutil.copyfile(ROOT / "icon-192.png", self.root / "icon-192.png")
        self.run_script(SHARE_IMAGE)
        output = self.root / "img/og-optika-mila.png"
        data = output.read_bytes()
        before = (data, output.stat().st_mtime_ns)
        self.assertEqual(data[:8], b"\x89PNG\r\n\x1a\n")
        self.assertEqual(struct.unpack(">II", data[16:24]), (1200, 630))
        result = self.run_script(SHARE_IMAGE, success=False)
        self.assertIn("Use -Force", result.stderr)
        self.assertEqual(before, (output.read_bytes(), output.stat().st_mtime_ns))

    @unittest.skipUnless(sys.platform == "win32", "System.Drawing generator requires Windows")
    def test_failed_share_image_input_preserves_existing_output(self):
        output = self.root / "img/og-optika-mila.png"
        output.write_bytes(b"existing output fixture")
        before = (output.read_bytes(), output.stat().st_mtime_ns)
        self.run_script(SHARE_IMAGE, "-Force", success=False)
        self.assertEqual(before, (output.read_bytes(), output.stat().st_mtime_ns))


class OfflineVerificationTests(unittest.TestCase):
    def test_asset_verification_makes_no_network_request_by_default(self):
        verifier = runpy.run_path(str(ROOT / "tools/verify-site.py"))
        with patch("urllib.request.urlopen", side_effect=AssertionError("unexpected network request")) as network, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(verifier["verify_original_assets"](False), 38)
            network.assert_not_called()


if __name__ == "__main__":
    unittest.main(verbosity=2)
