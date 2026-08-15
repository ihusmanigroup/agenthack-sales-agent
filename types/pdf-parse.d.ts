declare module "pdf-parse" {
  function pdf(dataBuffer: Buffer | Uint8Array | ArrayBuffer, options?: any): Promise<{ text: string; numpages: number; info: any; metadata: any; version: string }>;
  export = pdf;
}