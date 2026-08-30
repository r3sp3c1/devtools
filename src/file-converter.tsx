import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getSelectedFinderItems,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import React from "react";

export default function Command() {
  const [inputFiles, setInputFiles] = useState<string[]>([]);
  const [outputDir, setOutputDir] = useState<string[]>([
    `${process.env.HOME}/Downloads`,
  ]);
  const [outputName, setOutputName] = useState<string>("");
  const [format, setFormat] = useState<string>("pdf");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => {
        if (items.length > 0) {
          setInputFiles([items[0].path]);
          const parsed = path.parse(items[0].path);
          setOutputName(parsed.name);
          setOutputDir([parsed.dir]);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleInputFilesChange = (files: string[]) => {
    setInputFiles(files);
    if (files.length > 0) {
      const parsed = path.parse(files[0]);
      setOutputName(parsed.name);
      setOutputDir([parsed.dir]);
    }
  };

  const convertFile = (values: { format: string; outName: string }) => {
    if (inputFiles.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "Select an input file" });
      return;
    }
    if (outputDir.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Select an output directory",
      });
      return;
    }
    if (!values.outName) {
      showToast({
        style: Toast.Style.Failure,
        title: "Enter an output filename",
      });
      return;
    }

    setIsLoading(true);
    const inputPath = inputFiles[0];

    let safeOutName = values.outName;
    if (safeOutName.toLowerCase().endsWith(`.${values.format}`)) {
      safeOutName = safeOutName.slice(0, -(values.format.length + 1));
    }

    const outputPath = path.join(
      outputDir[0],
      `${safeOutName}.${values.format}`,
    );

    // Determine MIME type natively
    exec(`file -b --mime-type "${inputPath}"`, (err, stdout) => {
      const mime = stdout.trim();
      const isImageOrPDF =
        mime.startsWith("image/") || mime === "application/pdf";

      let cmd = "";

      if (values.format === "pdf") {
        if (isImageOrPDF) {
          // Image/PDF -> PDF
          cmd = `sips -s format pdf "${inputPath}" --out "${outputPath}"`;
        } else {
          // Text/Other -> PDF (using Print Spooler)
          cmd = `cupsfilter "${inputPath}" > "${outputPath}" 2>/dev/null`;
        }
      } else {
        // Target is an image (png, jpg, etc.)
        if (!isImageOrPDF) {
          setIsLoading(false);
          showToast({
            style: Toast.Style.Failure,
            title: "Invalid Conversion",
            message:
              "You cannot convert a text/document file to an image natively.",
          });
          return;
        }
        cmd = `sips -s format ${values.format} "${inputPath}" --out "${outputPath}"`;
      }

      showToast({ style: Toast.Style.Animated, title: "Converting..." });

      exec(cmd, (error, stdOut, stdErr) => {
        setIsLoading(false);
        if (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Conversion Failed",
            message: error.message,
          });
        } else {
          if (
            !fs.existsSync(outputPath) ||
            fs.statSync(outputPath).size === 0
          ) {
            showToast({
              style: Toast.Style.Failure,
              title: "Failed",
              message: "Output file is empty or unsupported format.",
            });
          } else {
            showToast({
              style: Toast.Style.Success,
              title: "Success!",
              message: `Saved to ${outputPath}`,
            });
          }
        }
      });
    });
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Convert File"
            icon={Icon.Wand}
            onSubmit={convertFile}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="input"
        title="Input File"
        value={inputFiles}
        onChange={handleInputFilesChange}
        canChooseDirectories={false}
        canChooseFiles={true}
        allowMultipleSelection={false}
      />

      <Form.Dropdown
        id="format"
        title="Convert To"
        value={format}
        onChange={setFormat}
      >
        <Form.Dropdown.Item value="pdf" title="PDF (.pdf)" />
        <Form.Dropdown.Item value="png" title="PNG (.png)" />
        <Form.Dropdown.Item value="jpeg" title="JPEG (.jpg)" />
        <Form.Dropdown.Item value="tiff" title="TIFF (.tiff)" />
        <Form.Dropdown.Item value="gif" title="GIF (.gif)" />
        <Form.Dropdown.Item value="bmp" title="BMP (.bmp)" />
        <Form.Dropdown.Item value="heic" title="HEIC (.heic)" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="outName"
        title="Output Filename"
        value={outputName}
        onChange={setOutputName}
        placeholder="ConvertedFile"
      />

      <Form.FilePicker
        id="output"
        title="Output Folder"
        value={outputDir}
        onChange={setOutputDir}
        canChooseDirectories={true}
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}
