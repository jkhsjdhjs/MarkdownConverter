import * as ChildProcess from "child_process";
import CultureInfo from "culture-info";
import * as FileSystem from "fs-extra";
import { MarkdownIt } from "markdown-it";
import * as Path from "path";
import * as Format from "string-template";
import { TextDocument, window } from "vscode";
import { ConversionType } from "./MarkdownConverter/ConversionType";
import { Converter } from "./MarkdownConverter/Converter";
import { MarkdownExtensionContributions } from "./MarkdownConverter/MarkdownExtensions";
import { ResourceManager } from "./Properties/ResourceManager";
import { Settings } from "./Properties/Settings";
import { Document } from "./System/Drawing/Document";
import { FileException } from "./System/IO/FileException";

/**
 * Provides the main logic of the extension
 */
export class Program
{
    /**
     * Converts a markdown-file to other file-types
     */
    public static async Main(documentRoot: string, document: TextDocument, types: ConversionType[], outDir: string, markdownParser: MarkdownIt, mdExtensions: MarkdownExtensionContributions)
    {
        let fileName = Path.parse(document.fileName).name;
        let converter = new Converter(documentRoot, new Document(document, markdownParser));
        converter.Document.Quality = Settings.Default.ConversionQuality;
        converter.Document.EmojiType = Settings.Default.EmojiType;

        for (let key in Settings.Default.Attributes)
        {
            converter.Document.Attributes[key] = Settings.Default.Attributes[key];
        }

        converter.Document.Locale = new CultureInfo(Settings.Default.Locale);
        converter.Document.DateFormat = Settings.Default.DateFormat;

        converter.Document.Paper = Settings.Default.PaperFormat;

        converter.Document.HeaderFooterEnabled = Settings.Default.HeaderFooterEnabled;
        converter.Document.Header.Content = Settings.Default.HeaderTemplate;
        converter.Document.Footer.Content = Settings.Default.FooterTemplate;

        converter.Document.TocSettings = Settings.Default.TocSettings;

        converter.Document.UseSystemPlugins = Settings.Default.UseSystemPlugins;

        try
        {
            if (Settings.Default.Template)
            {
                converter.Document.Template = (await FileSystem.readFile(Path.resolve(documentRoot, Settings.Default.Template))).toString();
            }
            else if (Settings.Default.SystemStylesEnabled)
            {
                converter.Document.Template = (await FileSystem.readFile(ResourceManager.Files.Get("SystemTemplate"))).toString();
            }
        }
        catch (exception)
        {
            if (
                exception instanceof Error &&
                "path" in exception)
            {
                throw new FileException(null, exception["path"]);
            }
            else
            {
                throw exception;
            }
        }

        if (Settings.Default.SystemStylesEnabled)
        {
            converter.Document.StyleSheets.push(ResourceManager.Files.Get("DefaultStyle"));
            converter.Document.StyleSheets.push(ResourceManager.Files.Get("EmojiStyle"));
        }

        if (Settings.Default.HighlightStyle === "None")
        {
            converter.Document.HighlightEnabled = false;
        }
        else
        {
            converter.Document.HighlightEnabled = true;

            if (Settings.Default.HighlightStyle === "Default")
            {
                converter.Document.StyleSheets.push(ResourceManager.Files.Get("DefaultHighlight"));
            }
            else
            {
                converter.Document.StyleSheets.push(Path.join(ResourceManager.Files.Get("HighlightJSStylesDir"), Settings.Default.HighlightStyle + ".css"));
            }
        }

        for (let styleSheet of Settings.Default.StyleSheets)
        {
            if (!Path.isAbsolute(styleSheet))
            {
                styleSheet = Path.resolve(documentRoot, styleSheet);
            }

            converter.Document.StyleSheets.push(styleSheet);
        }

        for (let styleSheet of mdExtensions.previewStyles)
        {
            converter.Document.StyleSheets.push(styleSheet.fsPath);
        }

        for (let script of mdExtensions.previewScripts)
        {
            converter.Document.Scripts.push(script.fsPath.toString());
        }

        let prompts = [];

        if (!await FileSystem.pathExists(outDir))
        {
            await FileSystem.mkdirp(outDir);
        }

        for (let type of types)
        {

            let extension: string;

            switch (type)
            {
                case ConversionType.HTML:
                    extension = "html";
                    break;
                case ConversionType.JPEG:
                    extension = "jpg";
                    break;
                case ConversionType.PNG:
                    extension = "png";
                    break;
                case ConversionType.PDF:
                default:
                    extension = "pdf";
                    break;
            }

            let destination = Path.join(outDir, fileName + "." + extension);
            await converter.Start(type, destination);

            prompts.push((async () =>
            {
                await window.showInformationMessage(
                    Format(ResourceManager.Resources.Get("SuccessMessage"), ConversionType[type], destination),
                    ResourceManager.Resources.Get("OpenFileLabel")).then(
                        (label) =>
                        {
                            if (label === ResourceManager.Resources.Get("OpenFileLabel"))
                            {
                                switch (process.platform)
                                {
                                    case "win32":
                                        ChildProcess.exec(Format('"{0}"', destination));
                                        break;
                                    case "darwin":
                                        ChildProcess.exec(Format('bash -c \'open "{0}"\'', destination));
                                        break;
                                    case "linux":
                                        ChildProcess.exec(Format('bash -c \'xdg-open "{0}"\'', destination));
                                        break;
                                    default:
                                        window.showWarningMessage(ResourceManager.Resources.Get("UnsupportedPlatformException"));
                                        break;
                                }
                            }
                        });
            })());
        }

        await Promise.all(prompts);
    }
}