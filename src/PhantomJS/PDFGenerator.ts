/* Preventing TypeScript's "name not found"-errors */
declare var phantom;
declare var document;

/* Importing phantom's modules */
let FS;
let System;
let WebPage;

function initialize()
{
    FS = require("fs");
    System = require("system");
    WebPage = require("webpage");
}

initialize();

console.log(FS.workingDirectory);
try
{
    Main(System.args.slice(1));
}
catch (e)
{
    if (e instanceof Error)
    {
        System.stderr.writeLine(e);
        phantom.exit(1);
    }
}

{
    /**
     * Starts the rendering-process.
     * @param args 
     */
    function Main(args): void
    {
        /**
         * The file-type of the resulting file.
         */
        let type: string;

        /**
         * The document to render.
         */
        let doc;

        /**
         * The path to save the rendered file to.
         */
        let destination: string;

        if (args.length >= 3)
        {
            let page = WebPage.create();
            type = args[0];
            doc = JSON.parse(FS.read(args[1]));
            destination = args[2];

            page.onLoadFinished = (status) =>
            {
                RenderPage(page);
            };
            page.setContent(doc.Content, null);
        }
        else
        {
            throw new SyntaxError("Some arguments are missing.");
        }

        function OnFinished()
        {
            System.stdout.writeLine(destination);
            phantom.exit();
        }

        /**
         * Replaces the pagenumber-variables inside the subject-variable.
         * 
         * @param subject
         * The subject to check for pagenumber-variables.
         */
        function ReplacePageNumbers(subject: string, pageNumber: number, pageCount: number): string
        {
            subject = subject.replace(/{{[\s]*(PageNumber|PageCount)[\s]*}}/g, (match: string): string =>
            {
                if (/PageNumber/g.test(match))
                {
                    return pageNumber.toString();
                }
                else if (/PageCount/g.test(match))
                {
                    return pageCount.toString();
                }
                return match;
            });
            return subject;
        }

        /**
         * Renders a page.
         * 
         * @param page
         * The page which is to be rendered.
         */
        function RenderPage(page)
        {
            let renderType;
            page.paperSize = CalculatePaperSize(page);

            switch (type)
            {
                case "BMP":
                    renderType = "bmp";
                    break;
                case "JPEG":
                    renderType = "jpeg";
                    break;
                case "PNG":
                    renderType = "png";
                    break;
                case "PPM":
                    renderType = "ppm";
                    break;
                case "PDF":
                default:
                    renderType = "pdf";
                    break;
            }

            page.render(destination, { type: renderType, quality: doc.Quality });
            OnFinished();
        }

        /**
         * Calculates the paper-size of the document.
         */
        function CalculatePaperSize(page)
        {
            let paper = CreatePaper();
            let styles = page.evaluate(GetStyles);

            if (doc.Header || doc.SpecialHeaders.length > 0 || doc.EvenHeader || doc.OddHeader || doc.LastHeader)
            {
                paper.header = CreateHeader(styles);
            }
            if (doc.Footer || doc.SpecialFooters.length > 0 || doc.EvenFooter || doc.OddFooter || doc.LastFooter)
            {
                paper.footer = CreateFooter(styles);
            }
            return paper;
        }

        /**
         * Creates a propper paper according to the document's Layout-settings.
         */
        function CreatePaper()
        {
            let paper: any = {};
            let layout = doc.Layout;

            if (layout.Margin.Top || layout.Margin.Right || layout.Margin.Bottom || layout.Margin.Left)
            {
                paper.margin = {
                    top: layout.Margin.Top,
                    right: layout.Margin.Right,
                    bottom: layout.Margin.Bottom,
                    left: layout.Margin.Left
                };
            }
            else
            {
                paper.margin = 0;
            }

            if (layout.Format)
            {
                paper.format = layout.Format;
                paper.orientation = layout.Orientation;
            }
            else if (layout.Width && layout.Height)
            {
                paper.width = layout.Width;
                paper.height = layout.Height;
            }

            return paper;
        }

        /**
         * Returns the file-includes and styles of a DOM-document.
         */
        function GetStyles()
        {
            let styles = document.querySelectorAll("link,style");
            styles = Array.prototype.reduce.call(styles, (style, node) =>
            {
                return style + (node.outerHTML || "");
            }, "");
            return styles;
        }

        /**
         * Creates a header-section.
         * 
         * @param styles
         * The css-styles of the header.
         */
        function CreateHeader(styles: string)
        {
            return {
                height: doc.Header.Height,
                contents: phantom.callback((pageNumber, pageCount) =>
                {
                    let header = GetHeader(pageNumber, pageCount);
                    return styles + ReplacePageNumbers(header.Content, pageNumber, pageCount);
                })
            };
        }

        /**
         * Determines the propper header according to the page-number and the number of pages.
         * 
         * @param pageNumber
         * The page-number.
         * 
         * @param pageCount
         * The number of pages.
         */
        function GetHeader(pageNumber, pageCount)
        {
            if (pageNumber === pageCount && doc.LastHeader)
            {
                return doc.LastHeader;
            }
            if (pageNumber in doc.SpecialHeaders)
            {
                return doc.SpecialHeaders[pageNumber];
            }
            else if (pageNumber % 2 === 0 && doc.EvenHeader)
            {
                return doc.EvenHeader;
            }
            else if (doc.OddHeader)
            {
                return doc.OddHeader;
            }
            else
            {
                return doc.Header;
            }
        }

        /**
         * Creates a footer-section.
         * 
         * @param styles
         * The css-styles of the header.
         */
        function CreateFooter(styles: string)
        {
            return {
                height: doc.Footer.Height,
                contents: phantom.callback((pageNumber, pageCount) =>
                {
                    let footer = GetFooter(pageNumber, pageCount);
                    return styles + ReplacePageNumbers(footer.Content, pageNumber, pageCount);
                })
            };
        }

        /**
         * Determines the propper footer according to the page-number and the number of pages.
         * 
         * @param pageNumber
         * The page-number.
         * 
         * @param pageCount
         * The number of pages.
         */
        function GetFooter(pageNumber, pageCount)
        {
            if (pageNumber === pageCount && doc.LastFooter)
            {
                return doc.LastFooter;
            }
            if (pageNumber in doc.SpecialFooters)
            {
                return doc.SpecialFooters[pageNumber];
            }
            else if (pageNumber % 2 === 0 && doc.EvenFooter)
            {
                return doc.EvenFooter;
            }
            else if (doc.OddFooter)
            {
                return doc.OddFooter;
            }
            else
            {
                return doc.Footer;
            }
        }
    }
}