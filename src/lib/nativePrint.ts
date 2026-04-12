import { Capacitor, registerPlugin } from "@capacitor/core";

type NativePrintPlugin = {
  printHtml(options: { html: string; jobName?: string }): Promise<void>;
  printTicketImage(options: {
    imageDataUrl: string;
    jobName?: string;
    copiesPerPage: number;
    pageMarginTop: number;
    pageMarginRight: number;
    pageMarginBottom: number;
    pageMarginLeft: number;
    ticketOffsets: Array<{ x: number; y: number }>;
    ticketSizes: Array<{ width: number; height: number }>;
  }): Promise<void>;
};

const NativePrint = registerPlugin<NativePrintPlugin>("NativePrint");

export const canUseNativePrint = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

export const printHtml = async (html: string, jobName?: string) => {
  if (!canUseNativePrint()) {
    throw new Error("Native print is only available on iOS");
  }

  return NativePrint.printHtml({ html, jobName });
};

export const printTicketImage = async (options: {
  imageDataUrl: string;
  jobName?: string;
  copiesPerPage: number;
  pageMarginTop: number;
  pageMarginRight: number;
  pageMarginBottom: number;
  pageMarginLeft: number;
  ticketOffsets: Array<{ x: number; y: number }>;
  ticketSizes: Array<{ width: number; height: number }>;
}) => {
  if (!canUseNativePrint()) {
    throw new Error("Native print is only available on iOS");
  }

  return NativePrint.printTicketImage(options);
};
