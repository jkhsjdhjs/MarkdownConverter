import PaperFormat from "./PaperFormat";
import { PDFOptions } from "puppeteer";

/**
 * Represents a custom paper-format.
 */
export default class CustomPaperFormat extends PaperFormat
{
    /**
     * The width.
     */
    private width: string = null;

    /**
     * The height.
     */
    private height: string = null;

    /**
     * Gets or sets the width.
     */
    public get Width(): string
    {
        return this.width;
    }
    
    public set Width(value: string)
    {
        this.width = value;
    }

    /**
     * Gets or sets the height.
     */
    public get Height(): string
    {
        return this.height;
    }

    public set Height(value: string)
    {
        this.height = value;
    }

    public get PDFOptions(): Partial<PDFOptions>
    {
        return {
            width: this.Width,
            height: this.Height
        };
    }
}