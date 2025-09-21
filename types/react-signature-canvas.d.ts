declare module "react-signature-canvas" {
  import * as React from "react";

  export interface SignatureCanvasProps {
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
    velocityFilterWeight?: number;
    minWidth?: number;
    maxWidth?: number;
    minDistance?: number;
    dotSize?: number | ((velocity: number) => number);
    penColor?: string;
    backgroundColor?: string;
    onBegin?: (event: any) => void;
    onEnd?: (event: any) => void;
    clearOnResize?: boolean;
  }

  export default class SignatureCanvas extends React.Component<SignatureCanvasProps> {
    clear(): void;
    isEmpty(): boolean;
    toDataURL(type?: string, encoderOptions?: number): string;
    fromDataURL(dataUrl: string, options?: any, callback?: () => void): void;
    on(): void;
    off(): void;
    getCanvas(): HTMLCanvasElement;
    getTrimmedCanvas(): HTMLCanvasElement;
  }
}



