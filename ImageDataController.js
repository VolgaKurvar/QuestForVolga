//imageDataObjectへの各種操作を提供するクラス

"use strict";

export default class ImageDataController {
    constructor(imageData = new ImageData()) {
        this.imageData = imageData;

    }

    getPixelOffset(x, y) {
        return (x + this.imageData.width * y) * 4;
    }

    getColor(x, y) {
        const n = this.getPixelOffset(x, y);
        return [this.imageData.data[n], this.imageData.data[n + 1], this.imageData.data[n + 2]];
    }

    setColor(x, y, r, g, b) {
        const n = this.getPixelOffset(x, y);
        this.imageData.data[n] = r;
        this.imageData.data[n + 1] = g;
        this.imageData.data[n + 2] = b;
    }

    checkColor(x, y, r, g, b) {
        const n = this.getPixelOffset(x, y);
        return this.imageData.data[n] === r && this.imageData.data[n + 1] === g && this.imageData.data[n + 2] === b;
    }
}