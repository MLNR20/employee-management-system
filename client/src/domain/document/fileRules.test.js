import { describeFileUsage, fileError } from "./fileRules";

const MB = 1024 * 1024;

test("a file needs an accepted name and to fit the server's size limit", () => {
  expect(fileError({ name: "scan.PDF", size: 10 })).toBeUndefined();
  expect(fileError({ name: "scan.docx", size: 10 })).toMatch(/PDF, PNG or JPEG/);
  expect(fileError({ name: "scan.png", size: 6 * MB })).toMatch(/larger than 5 MB/);
  expect(fileError({ name: "scan.png", size: 6 * MB }, 8 * MB)).toBeUndefined();
  expect(fileError({ name: "scan.png", size: 3 * MB }, 2 * MB)).toMatch(/larger than 2 MB/);
});

test("the usage reads in words, and warns when the storage is nearly full", () => {
  const files = {
    count: 2,
    bytes: 1.5 * MB,
    totalBytes: 10 * MB,
    maxFileBytes: 5 * MB,
    maxFilesPerEmployee: 25,
    maxEmployeeBytes: 50 * MB,
    maxTotalBytes: 400 * MB,
  };
  expect(describeFileUsage(files)).toEqual({
    usage: "Files: 2 of 25, 1.5 MB of 50 MB used. PDF, PNG or JPEG up to 5 MB each.",
    warning: null,
  });
  expect(describeFileUsage({ ...files, totalBytes: 330 * MB }).warning).toMatch(/82% full/);
  expect(describeFileUsage({ ...files, bytes: 14 }).usage).toMatch("under 0.1 MB of 50 MB");
});
