import test from "node:test";
import assert from "node:assert/strict";
import { buildSyntheticDiffFromFiles } from "../scripts/reviewEngine.mjs";

test("buildSyntheticDiffFromFiles menerima maksimal 5 file PHP dan menolak ekstensi lain", () => {
  const result = buildSyntheticDiffFromFiles(
    [
      { name: "UserController.php", content: "<?php\nclass UserController {}" },
      { name: "notes.txt", content: "ignore me" },
      {
        name: "ReportService.php",
        content: "<?php\nfunction run() { return true; }",
      },
    ],
    { maxFiles: 5, allowedExtensions: [".php"] },
  );

  assert.equal(result.files.length, 2);
  assert.match(
    result.diffText,
    /diff --git a\/UserController.php b\/UserController.php/,
  );
  assert.match(
    result.diffText,
    /diff --git a\/ReportService.php b\/ReportService.php/,
  );
  assert.doesNotMatch(result.diffText, /notes.txt/);
  assert.deepEqual(result.rejected, [
    { name: "notes.txt", reason: "Ekstensi tidak didukung." },
  ]);
});
