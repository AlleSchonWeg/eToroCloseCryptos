// ==UserScript==
// @name         eToro Close Cryptos
// @namespace    Disable eToro Crypto Restrictions
// @version      1.4
// @description  Enable SL und TP on Cryptos. Website needs to be open and visible or tab must be active.
// @author       S99
// @match        https://www.etoro.com/*
// @grant        unsafeWindow
// @run-at       document-idle
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==
//debugger;
//Konstanten

var demo=true;
var cryptos=["BTC", "XRP", "ETHEREUM", "DASH", "LTC", "ETC", "BCH", "XLM", "NEO", "ADA", "MIOTA", "EOS", "TRX", "ZEC", "BNB", "XTZ"];

this.$ = this.jQuery = jQuery.noConflict(true);
waitForKeyElements("ui-table[ui-table-id='portfolioManualTrades']",pageLoaded);

//globale Variablen
var timeout=null;
var rootScope=null;
var scriptStarted=false;
var isRunning=false;
var interval=null;

function pageLoaded(jNode) {
    //Timeout wird gebraucht, um angular click() feuern zu können
    angular.element(document).injector().invoke(["$rootScope", "$timeout", function($rootScope, $timeout) {
        console.log("Start...");
        timeout = $timeout;
        rootScope = $rootScope;
    }]);
    var startbtn = $("<button/>",{
        text: "Display crypto TP/SL settings",
        click: function () {
            displayControls();
        }
    });
    startbtn.css({"width": "250px", "border-width": "2px 2px 2px 2px", "border-style": "solid", "heigth": "70px", "font-size": "100%"});
    $(".table-tab-menu").append(startbtn);
    scriptStarted=false;
}
function displayControls(){
    if(!scriptStarted){ //Verhindert, dass Controlls mehrfach eingeblendet werden, falls mehrfach Button geclickt wird.
        var conf=confirm("Click 'cancel' for demo mode. Close-Trade dialog will appear, but then canceled. \n\nClick 'ok' to activate. Close-Trade dialog will appear and close trade!");
        demo=!conf;
        var demoText=createTextControl("demoMode", demo ? " Running demo mode" : " Running real mode", "blue");
        $(".table-tab-menu").append(demoText);
        insertCtrl();
    }
    scriptStarted=true;
}
function hookPriceChangeEventHandler(ctrl, tradeId){
    var id= tradeId;
    ctrl.on( "DOMSubtreeModified", function() {
        if(document[hidden]){
            console.error("Cannot close, because website has no focus.");
        }
        else{
            priceChanged(id, convertPriceStringToDecimal($(this).text().trim()));
        }
    });
}
function priceChanged(tradeId, currentPrice){
    var box = $("#cb_"+tradeId);
    if(box.length === 0 || (box.length === 1 && !box.prop("checked"))){ //Wenn Checkbox nicht da ist oder nicht gewählt ist abbrechen.
        return;
    }
    if(isRunning){
        setTimeout(function() {priceChanged(tradeId,currentPrice);}, 1000);
    }
    else{
        isRunning=true;
        changeBackground(tradeId, true);
        handlePriceChange(tradeId, currentPrice, box);
        setTimeout(function() {changeBackground(tradeId, false);}, 800); //Nach x sekunden wieder zurückstellen
    }
}
function handlePriceChange(tradeId, currentPrice, box){
    var sentiment = box.attr("data-bos");
    var tpVal = convertPriceStringToDecimal($("#id_"+tradeId+"_tp").val());
    var slVal = convertPriceStringToDecimal($("#id_"+tradeId+"_sl").val());

    var executeClose = needExecute(sentiment, tradeId, currentPrice, tpVal, slVal);

    console.log("handlePriceChange. Sentiment: "+sentiment+" | Preis: "+currentPrice+" | TP: "+tpVal+" | SL: "+slVal+" || Close position: " + executeClose);

    if(executeClose){
        closeTrade(tradeId);
    }
    else{
        isRunning=false;
        return;
    }
}
function needExecute(sentiment, tradeId, currentPrice, tpVal, slVal){
    var executeClose=false;
    if(sentiment === "BUY"){
        executeClose = checkBuyAction(tradeId, currentPrice, tpVal, slVal);
    }
    else if(sentiment === "SELL"){
        executeClose = checkSellAction(tradeId, currentPrice, tpVal, slVal);
    }
    return executeClose;
}
function handleException(tradeId, e){
    //Bei TimeOut mit aufgetretener Exception, die wieder geworfen wird diese nicht den Stack hochgereicht. Deswegen gesondert behandeln.
    var box=$("#cb_"+tradeId);
    if(box.length == 1){
        box.prop( "checked", false ); //Checkbox deaktivieren. sonst wird immer wieder versucht.
    }
    console.error("Error (TradeId: "+tradeId+"): %o", e);
    isRunning=false;
}
function closeTrade(tradeId){
    //Hier geht es los. Reihenfolge, wenn alles gut geht: openCloseTradeDialog --> triggerOpenClosePositionClick --> startClose -> triggerCleanDialog
    try{
        openCloseTradeDialog(tradeId); //Funktion öffnet Dialog zum schließen des Trades. Funktion kann beendet sein, bevor der Dialog komplett geladen ist.
    }
    catch(ex){
        handleException(tradeId,ex);
        return;
    }
}
var selectorBtnCloseTrade = "div[ng-controller='apps.trader.portfolio.closePosition.closePositionCtrl'] button.w-sm-footer-button.e-btn-big.red.pointer";
function startClose(tradeId){
    timeout(function(){
        try{
            if(!demo){
                document.querySelector(selectorBtnCloseTrade).click();
                //closeBtn.click(); //Trade schließen
            }
            else{
                // var closeForm=$('div[ng-controller="apps.trader.portfolio.closePosition.closePositionCtrl"]').find('div[class="w-share-header-nav-button-x sprite"]');
                //angular.element("div[ng-controller='apps.trader.portfolio.closePosition.closePositionCtrl']").find("div[class='w-share-header-nav-button-x sprite']").triggerHandler("click");
                //console.log("unsafeWindow.$: %o",unsafeWindow.$);
                unsafeWindow.$("div[ng-controller='apps.trader.portfolio.closePosition.closePositionCtrl']").find("div[class='w-share-header-nav-button-x sprite']").click();
                //closeForm.click();
            }
            console.log("Trade closed (Demo: "+demo+"): " + tradeId);
            removeStore(tradeId); //Entfernen aus Store. auch falls Close nicht geklappt hat
            triggerCleanDialog(tradeId);
        }
        catch (ex){
            handleException(tradeId, ex);
            return;
        }
    },100);
}
var triggerCleanDialogCounter=0;
function triggerCleanDialog(tradeId){
    console.log("cleanDialog (Try: "+triggerCleanDialogCounter+"). Check if dialog still open: " + tradeId);
    var closeDlg = $("[id^=uidialog]");
    if(closeDlg.length == 1){
        if(triggerCleanDialogCounter == 10){
            triggerCleanDialogCounter=0;
            console.log("cleanDialog still open. Try to remove (closeDlg Len: "+closeDlg.length+"): " + tradeId);
            closeDlg.remove();
            try{
                throw "Can not close dialog automatically after 10 trys. Remove manually from DOM. Looks like trade was not closed.";
            }
            catch (ex){
                handleException(tradeId, ex);
                return;
            }
        }
        else{
            triggerCleanDialogCounter++;
            setTimeout(function() {triggerCleanDialog(tradeId);}, 500); //Noch zeitgeben den Dialog zu schließen, dann selbst schliesen. Setzt isRunning=false.
        }
    }
    else{
        $("#cb_"+tradeId).prop( "checked", false );
        triggerCleanDialogCounter=0;
        isRunning=false;
    }
}
function openCloseTradeDialog(tradeId) {
    var closeCtrl = null;
    var selector = "ui-table ui-table-body div[data-id='" + tradeId + "'] div[data-etoro-automation-id='portfolio-manual-trades-table-body-close-button']";
    try{
        closeCtrl = $(selector);
        console.log("closeDialog (tradeid: "+tradeId+"): %o", closeCtrl);
        if(closeCtrl.length == 0){
            throw "No button found to open CloseDlg!";
        }
    }
    catch(ex){
        handleException(tradeId, ex);
        return;
    }
    try{
        if(closeCtrl.length == 1){
            triggerOpenClosePositionClick(true,tradeId);
        }
    }
    catch(ex){
        handleException(tradeId, ex);
        return;
    }
}
var triggerOpenCloseCounter=0;
function triggerOpenClosePositionClick(executeClick, tradeId){
    if(triggerOpenCloseCounter == 10){
        triggerOpenCloseCounter=0;
        throw "Konnte nach " + triggerOpenCloseCounter + " Versuchen Dialog nicht öffnen. Button nicht gefunden.";
    }
    if(executeClick){
        var selector = "ui-table ui-table-body div[data-id='" + tradeId + "'] div[data-etoro-automation-id='portfolio-manual-trades-table-body-close-button']";
        timeout(function(){
            angular.element(selector).triggerHandler("click");
        },0);
    }
    var closeBtn = $(selectorBtnCloseTrade); //$("[id^=uidialog]");
    if(closeBtn.length == 0){ //CloseDialog noch nicht offen
        triggerOpenCloseCounter++;
        setTimeout(function() {triggerOpenClosePositionClick(false,tradeId);}, 500);
    }
    else{ //Dialog offen. Trade schließen
        triggerOpenCloseCounter=0;
        console.log("closeBtn (tradeid: "+tradeId+"): %o", closeBtn);
        startClose(tradeId);
    }
}
// Prüfe, ob Trades geschlossen werden sollen
function checkBuyAction(tradeId, currentPrice, tpVal, slVal){
    if(currentPrice >= tpVal || currentPrice <= slVal){
        if(currentPrice >= tpVal){
            console.log("BUY TP greater currrent price!" + currentPrice +"|"+tpVal+"|"+slVal);
        }
        if(currentPrice <= slVal){
            console.log("BUY SL smaller currrent price!" + currentPrice +"<="+slVal);
        }
        return true;
    }
    return false;
}
function checkSellAction(tradeId, currentPrice, tpVal, slVal){
    if(currentPrice <= tpVal || currentPrice >= slVal){
        if(currentPrice <= tpVal ){
            console.log("SELL TP smaller currrent price!" + currentPrice +"|"+tpVal+"|"+slVal);
        }
        if(currentPrice >= slVal){
            console.log("SELL SL greater currrent price!" + currentPrice +"|"+tpVal+"|"+slVal);
        }
        return true;
    }
    return false;
}
// Binde Controls in Seite ein
function insertCtrl(){
    $("ui-table ui-table-body").children().each( function( index, element ){
        var row = $(this).find(".ui-table-row");
        var tradeId = row.attr("data-id"); //eindeutige Id des Trades
        var instrument = row.find("span[data-etoro-automation-id*='portfolio-manual-trades-table-body-market-name']").text().trim().toUpperCase(); //Instrument
        var isCrypto= jQuery.inArray(instrument,cryptos) != -1;
        if(tradeId && isCrypto){
            var buyOrSellText = row.find("span[data-etoro-automation-id*='portfolio-manual-trades-table-body-market-buy-label']").text().trim().toUpperCase(); //Buy
            if(!buyOrSellText){
                buyOrSellText = row.find("span[data-etoro-automation-id*='portfolio-manual-trades-table-body-market-sell-label']").text().trim().toUpperCase(); //Sell
            }
            var bdy = row.find("ui-table-body-slot"); //Enthält Texte, wie SL, TP und Preis
            console.log(buyOrSellText);
            var currentPriceCtrl = bdy.find("span[data-etoro-automation-id*='portfolio-manual-trades-table-body-last-price']"); //Control aktueller Preis
            var currentSlCtrl = bdy.find("span[data-etoro-automation-id*='portfolio-manual-trades-table-body-stop-loss-rate']"); //Control aktueller SL
            var currentTpCtrl = bdy.find("span[data-etoro-automation-id*='portfolio-manual-trades-table-body-take-profit-rate']"); //Control aktueller TP
            var chk = false;
            var TP = convertPriceStringToDecimal(currentTpCtrl.text().trim());
            var SL = convertPriceStringToDecimal(currentSlCtrl.text().trim());
            var savedData = getStore(tradeId,false); //savedData ist Array[3] CheckBox(bool), TP (decimal), SL (decimal) | Oder "" wenn nichts gespeichert
            if(savedData != ""){
                if(savedData[0] == true){ //Lieber beim starten den Haken mal raus. Nicht, dass es gleich losgeht.
                    savedData[0]=false;
                    setOrUpdateStore(tradeId,savedData);
                }
                chk=savedData[0];
                TP=savedData[1];
                SL=savedData[2];
            }
            var container = createDiv();
            container.append(createCheckBoxInputControl(tradeId, chk, buyOrSellText));
            container.append(createTextControl(tradeId, " TP: ", "green"));
            container.append(createTxtInputControl(tradeId, TP, false));
            container.append(createTextControl(tradeId, " SL: ", "red"));
            container.append(createTxtInputControl(tradeId, SL , true));
            hookPriceChangeEventHandler(currentPriceCtrl, tradeId); //Eventhandler anfügen, damit Preisänderungen verfolgt werden
            row.append(container);
        }
    });
}
//Controls ChangeEventHandler
function txtBoxValueChanged(self) {
    var txtBox = $(self);
    console.log("txtBoxValueChanged: " + txtBox.val());
    console.log(txtBox);
    var cbBox = $("#cb_"+txtBox.attr("data-id")); //Zugehörige Checkbox bei Änderung deaktivieren.
    cbBox.prop("checked", false); //Checked deaktivieren, nicht dass blödsinn drin steht.
}
function chkBoxChanged(self){
    var box = $(self);
    var tradeId =  box.attr("data-id");
    try{
        var data = createDataArray(tradeId);
        setOrUpdateStore(tradeId, data);
    }
    catch (ex){
        console.error(ex);
        box.prop( "checked", false );
        var storedDate = getStore(tradeId);
        if(storedDate){
            storedDate[0] = false;
            setOrUpdateStore(tradeId, storedDate,false);
        }
    }
}
//Data und Konvertierung
function createDataArray(tradeId){
    var chk = $("#cb_"+tradeId).prop("checked");
    var tpTxt = convertPriceStringToDecimal($("#id_"+tradeId+"_tp").val());
    var slTxt = convertPriceStringToDecimal($("#id_"+tradeId+"_sl").val());
    if(tpTxt && slTxt){
        var result = [];
        result[0]=chk;
        result[1]=tpTxt;
        result[2]=slTxt;
        return result;
    }
    throw "createDataArray failed";
}
function convertPriceStringToDecimal(input){
    if(input){
        var str = input.replace(',','');
        return parseToFloat(str);
    }
    return null;
}
function convertPriceDecimalToString(input){
    if(input){
        var str = ""+input;
        return str.replace('.',',');
    }
    return null;
}
//Create Controls
function createTxtInputControl(tradeId, value, forSl){
    var type = "tp";
    var color = "green";
    if(isNaN(value)){
        value = 99999999;
    }
    if(forSl){
        type = "sl";
        color = "red";
        if(isNaN(value)){
            value = 0.01;
        }
    }
    var txtBox = $("<input data-type='"+type+"' id='id_"+tradeId+"_"+type+"' data-id='"+tradeId+"' type='number' value="+value+" step='0.01' min='0' required style='border:2px solid "+color+";height:20px' />");
    txtBox.on( "change", function() {
        txtBoxValueChanged(this);
    });
    return txtBox;
}
function createCheckBoxInputControl(tradeId, checked, buyOrSell){
    var chk = "";
    if(checked){
        chk = "checked";
    }
    //position.IsBuy
    var box = $("<input data-bos='"+buyOrSell+"' "+chk+" id='cb_"+tradeId+"' data-id='"+tradeId+"' type='checkbox' />");
    box.css({
        "-moz-appearance": "checkbox",
        "-webkit-appearance": "checkbox",
        "appearance": "checkbox"
    });
    box.css({
        "-ms-transform" : "scale(1.5)", /* IE */
        "-moz-transform": "scale(1.5)", /* FF */
        "-webkit-transform": "scale(1.5)", /* Safari and Chrome */
        "-o-transform": "scale(1.5)" /* Opera */
    });
    box.on( "change", function() {
        chkBoxChanged(this);
    });
    return box;
}
function createDiv(){
    return $("<div />");
}
function createTextControl(tradeId, text, color){
    return $("<span />").attr("data-id", tradeId).css({
        "color": color,
        "font-size": "20px"
    }).html(text);
}
//Storage
var storePrefix = "AUTOCLOSE_";
function setOrUpdateStore(key, value){
    if(key && value){
        window.localStorage.setItem(storePrefix+key,JSON.stringify(value));
        console.log("Save: "+JSON.stringify(value));
        return;
    }
    throw "setOrUpdateStore key or value === null";
}
function removeStore(key){
    if(key){
        window.localStorage.removeItem(storePrefix+key);
        console.log("removeItem TradeId: "+key);
        return;
    }
}
function getStore(key){
    if(key){
        var result = window.localStorage.getItem(storePrefix+key);
        console.log("Load: "+result);
        if(!result){
            return "";
        }
        return JSON.parse(result);
    }
    throw "getStore key === null";
}
function changeBackground(tradeId, start){
    if(start){
        $("#id_"+tradeId+"_tp").css("background-color", "#339933");
        $("#id_"+tradeId+"_sl").css("background-color", "#ff5757");
    }
    else{
        $("#id_"+tradeId+"_tp").css("background-color", "");
        $("#id_"+tradeId+"_sl").css("background-color", "");
    }
}
//--------------------------------------------------
var hidden, visibilityChange;
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
    hidden = "hidden";
    visibilityChange = "visibilitychange";
} else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
}
