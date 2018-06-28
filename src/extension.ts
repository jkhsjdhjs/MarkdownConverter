// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as VSCode from "vscode";
import * as Path from "path";
import * as ChildProcess from "child_process";
import ConversionType from "./ConversionType";
import MarkdownFileNotFoundException from "./System/MarkdownFileNotFoundException";
import * as NLS from "vscode-nls";
import * as NPM from "npm";
import * as PhantomJS from "phantomjs-prebuilt";
import ProcessException from "./System/Tasks/ProcessException";
import Program from "./Program";
import Settings from "./Properties/Settings";
import * as Shell from "shelljs";
import UnauthorizedAccessException from "./System/UnauthorizedAccessException";
import YAMLException from "./System/YAML/YAMLException";
import Resources from "./System/ResourceManager";
import CultureInfo from "culture-info";
import * as Format from "string-template";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: VSCode.ExtensionContext)
{
    // Gets a value indicating whether phantomjs could be built.
    let phantomJSBuilt = null;
    Resources.Culture = new CultureInfo(Settings.Default.Locale);

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    // console.log('Congratulations, your extension "markdown-converter" is now active!');

    // Rebuilding PhantomJS if required.
    if (PhantomJS.platform !== process.platform)
    {
        try
        {
            let env = process.env;
            env["PHANTOMJS_PLATFORM"] = process.platform;
            env["PHANTOMJS_ARCH"] = process.arch;
            VSCode.window.showInformationMessage(Resources.Get("UpdateMessage"));
            process.chdir(Path.join(__dirname, "..", ".."));

            ChildProcess.exec(
                Path.join("node_modules", ".bin", "npm") + " rebuild phantomjs-prebuilt",
                {
                    env
                },
                (error, stdout, stderr) =>
                {
                    if (!error && !stderr)
                    {
                        console.log(stdout);
                        phantomJSBuilt = true;
                        VSCode.window.showInformationMessage(Resources.Get("UpdateFinishedMessage"));
                    }
                    else
                    {
                        throw new ProcessException("", stdout, stderr, error);
                    }
                });
        }
        catch (e)
        {
            VSCode.window.showErrorMessage(Resources.Get("UpdateFinishedMessage"));
            phantomJSBuilt = false;
        }
    }

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposables = [
        VSCode.commands.registerCommand("markdownConverter.convert", async () =>
        {
            // The code you place here will be executed every time your command is executed
            if (PhantomJS.platform !== process.platform)
            {
                if (phantomJSBuilt)
                {
                    VSCode.window.showInformationMessage(Resources.Get("UpdateFinishedMessage"));
                }
                else
                {
                    VSCode.window.showWarningMessage(Resources.Get("UpdateFailedMessage"));
                }
            }
            else
            {
                try
                {
                    let markdownDoc = getMarkdownDoc();

                    if (markdownDoc)
                    {
                        /* Preparing the arguments */
                        let name: string;
                        let base: string;
                        let outDir = Settings.Default.OutputDirectory;

                        if (VSCode.workspace.workspaceFolders && (VSCode.workspace.workspaceFolders.length === 1))
                        {
                            base = VSCode.workspace.workspaceFolders[0].uri.fsPath;
                        }
                        else if (!markdownDoc.isUntitled)
                        {
                            base = Path.dirname(markdownDoc.fileName);
                        }
                        else
                        {
                            base = await VSCode.window.showInputBox({
                                prompt: Resources.Get("OutDirPrompt")
                            });
                        }

                        if (!Path.isAbsolute(outDir))
                        {
                            outDir = Path.resolve(base, outDir);
                        }

                        if (!markdownDoc.isUntitled)
                        {
                            name = Path.parse(markdownDoc.fileName).name;
                        }
                        else
                        {
                            name = "temp";
                        }

                        let path = process.cwd();
                        {
                            process.chdir(base);

                            /* Executing the main logic */
                            await Program.Main(markdownDoc, Settings.Default.ConversionTypes, outDir, name, Settings.Default.AutoSave);
                        }
                        process.chdir(path);
                    }
                    else
                    {
                        throw new MarkdownFileNotFoundException();
                    }
                }
                catch (e)
                {
                    let message;

                    if (e instanceof UnauthorizedAccessException)
                    {
                        message = Resources.Get("UnauthorizedAccessException");
                    }
                    else if (e instanceof YAMLException)
                    {
                        message = Format(Resources.Get("YAMLException"), e.Mark.line + 1, e.Mark.column);
                    }
                    else if (e instanceof Error)
                    {
                        throw e;
                    }
                    VSCode.window.showErrorMessage(message);
                }
            }
        })
    ];

    disposables.forEach(disposable =>
    {
        context.subscriptions.push(disposable);
    });

    /**
     * Tries to find a markdown-file
     */
    function getMarkdownDoc(): VSCode.TextDocument
    {
        if (VSCode.window.activeTextEditor && (VSCode.window.activeTextEditor.document.languageId === "markdown" || Settings.Default.IgnoreLanguage))
        {
            return VSCode.window.activeTextEditor.document;
        }
        for (let textEditor of VSCode.window.visibleTextEditors)
        {
            if (textEditor.document.languageId === "markdown")
            {
                return textEditor.document;
            }
        }
        return null;
    }
}

// this method is called when your extension is deactivated
export function deactivate()
{
}