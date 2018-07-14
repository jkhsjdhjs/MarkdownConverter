import Document from "./Document";
import Renderable from "./Renderable";

/**
 * Represents a fragment of a document.
 */
export default class DocumentFragment extends Renderable
{
    /**
     * The document this fragment belongs to.
     */
    private document: Document;

    /**
     * Initializes a new instance of the `Document` class.
     * 
     * @param document
     * The document this fragment belongs to.
     */
    public constructor(document: Document)
    {
        super();
        this.document = document;
    }

    /**
     * Gets the document this fragment belongs to.
     */
    public get Document(): Document
    {
        return this.document;
    }

    /**
     * Renders a text.
     * 
     * @param text
     * The text to render.
     */
    protected async RenderText(text: string): Promise<string>
    {
        return await this.RenderTextBy(this.Document, text);
    }
}