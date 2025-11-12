declare module 'jspdf-autotable' {
  // autoTable can be exported as default or augment jsPDF with plugin
  export default function autoTable(doc: any, options: any): void;
  const _default: typeof autoTable;
  export { _default as autoTable };
}
