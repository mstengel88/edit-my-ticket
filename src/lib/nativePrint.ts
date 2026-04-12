import { Capacitor, registerPlugin } from "@capacitor/core";

type NativePrintPlugin = {
  printHtml(options: { html: string; jobName?: string }): Promise<void>;
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
