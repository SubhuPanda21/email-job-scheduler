"use client";
import { ReactNode, useRef } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, IndentDecrease, IndentIncrease, Italic, List, ListOrdered, Quote, Redo2, Strikethrough, Underline, Undo2 } from "lucide-react";

const run = (cmd: string, value?: string) => document.execCommand(cmd, false, value);

function Tool({ cmd, value, label, children }: { cmd: string; value?: string; label: string; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onMouseDown={(e) => { e.preventDefault(); run(cmd, value); }}
      className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
      {children}
    </button>
  );
}
const Divider = () => <span className="mx-1 h-4 w-px bg-gray-200" />;

export function RichTextEditor({ onChange }: { onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="rounded-xl bg-[#fafafa]">
      <div className="flex flex-wrap items-center gap-0.5 rounded-full bg-white mx-3 mt-3 px-2 py-1 shadow-sm">
        <Tool cmd="undo" label="Undo"><Undo2 size={15} /></Tool>
        <Tool cmd="redo" label="Redo"><Redo2 size={15} /></Tool>
        <Divider />
        <select aria-label="Font size" defaultValue="3" className="bg-transparent text-xs text-gray-600 focus:outline-none"
          onChange={(e) => { ref.current?.focus(); run("fontSize", e.target.value); }}>
          <option value="2">Small</option><option value="3">Normal</option><option value="5">Large</option><option value="6">Huge</option>
        </select>
        <Divider />
        <Tool cmd="bold" label="Bold"><Bold size={15} /></Tool>
        <Tool cmd="italic" label="Italic"><Italic size={15} /></Tool>
        <Tool cmd="underline" label="Underline"><Underline size={15} /></Tool>
        <Tool cmd="strikeThrough" label="Strikethrough"><Strikethrough size={15} /></Tool>
        <Divider />
        <Tool cmd="justifyLeft" label="Align left"><AlignLeft size={15} /></Tool>
        <Tool cmd="justifyCenter" label="Align center"><AlignCenter size={15} /></Tool>
        <Tool cmd="justifyRight" label="Align right"><AlignRight size={15} /></Tool>
        <Divider />
        <Tool cmd="insertOrderedList" label="Numbered list"><ListOrdered size={15} /></Tool>
        <Tool cmd="insertUnorderedList" label="Bulleted list"><List size={15} /></Tool>
        <Tool cmd="indent" label="Indent"><IndentIncrease size={15} /></Tool>
        <Tool cmd="outdent" label="Outdent"><IndentDecrease size={15} /></Tool>
        <Tool cmd="formatBlock" value="blockquote" label="Quote"><Quote size={15} /></Tool>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        data-placeholder="Type Your Reply..."
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        onPaste={(e) => { e.preventDefault(); run("insertText", e.clipboardData.getData("text/plain")); }}
        className="rte min-h-[340px] px-5 py-4 text-sm focus:outline-none"
      />
    </div>
  );
}
