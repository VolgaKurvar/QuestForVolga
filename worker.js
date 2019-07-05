// UIスレッドからのデータを取得します
"use strict";

import ImageDataController from "./ImageDataController.js";

onmessage = function (e) {
    console.log(e.data);
    let politicalMap = new ImageDataController(e.data);
    //let politicalMap = e.data;
    //this.console.log(e.data);
    //politicalMap.setColor(1, 1, 255, 0, 0);

    //...dataを元に重たい処理などを行う
    var result = "hello";//...

    //結果をUIスレッドに返す
    postMessage(result);

};