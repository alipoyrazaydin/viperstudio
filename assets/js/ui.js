/*
    ViperStudio UI Library
    By Ali Poyraz AYDIN (KIGIPUX)
*/

void function() {
    Object.prototype.with = function (obj) { Object.assign(this, obj); return this; };
    Object.prototype.withClone = function (obj) { let j = this; Object.assign(j, obj); return j; };
    Object.prototype.onto = function (func) { func.call(this, this); return this; };
    Object.prototype.ontoClone = function (func) { let j = this; func.call(j, j); return j; };
    Object.prototype.dispose = function () { delete this; }

    Element.prototype.render = function(...elements) { elements.forEach(e => this.appendChild(e)); };

    Array.prototype.any = function () { return this.length > 0 };
    Array.prototype.remove = function (val) { return ((idx = this.indexOf(val)) != -1 ? this.splice(idx, 1) : []); };
    
    String.prototype.toUpperCaseFirstLetter = function () { return this.charAt(0).toUpperCase() + this.slice(1); };
    String.prototype.reverse = function (str) { return str == '' ? '' : str.split("").reverse().join(""); };
    String.prototype.padCenter = function (gap, gapChar = ' ') { return gap <= this.length ? this : gapExt = (gap / 2) - (this.length / 2), gapFixed = Math.floor(gapExt), gapChar.repeat(gapFixed !== gapExt ? gapFixed + 1 : gapFixed) + this + gapChar.repeat(gapFixed); };

    window.isset = function (e) { return !(e === null || e === undefined); };
    window.isnotset = function (e) { return (e === null || e === undefined); };
    window.unset = function (e) { delete e; };

    window.UI = {
        createDropdown(name,elements){
            return document.createElement("select").onto(function(){
                this.classList.add("dropdown")
                if (name) this.appendChild(document.createElement("option").with({disabled:true}));
                elements.forEach(element => this.appendChild(document.createElement("option").with({
                    innerHTML: element.html,
                    value: element.value,
                    selected: element.default ?? false
                })));
            });
        },
        createSeperator(){
            return document.createElement("div").onto(e => e.classList.add("seperator"));
        },
        createButton(name){
            return document.createElement("button").onto(e => e.innerHTML = name);
        },
        createMenuButton(text, cAction){
            return document.createElement("viperlink").onto(e => {e.innerHTML = text, e.addEventListener("click",cAction)})
        }
    }

    window.R = {}.onto(function(){document.querySelectorAll("[r]").forEach(e => this[e.getAttribute("r")] = e)});
} ()