/*
    ViperEngine Processor.
    by Ali Poyraz AYDIN
*/

function CompileWorker(...codes) { return URL.createObjectURL(new Blob([...codes], { type: 'application/javascript' })) };
function Librarify(...libs) { let x = ""; libs.forEach(e => x += e.toString()); return x };

class WrappingStack {
    constructor(stackSize = 256) {
        let sp = 0;
        const stack = [];
        for (let ii = 0; ii < stackSize; ++ii) {
            stack.push(0);
        }
        return {
            pop: function () {
                sp = (sp === 0) ? (stackSize - 1) : (sp - 1);
                return stack[sp]
            },
            push: function (v) {
                stack[sp++] = v;
                sp = sp % stackSize
            },
            pick: function (index) {
                let i = sp - Math.floor(index) - 1;
                while (i < 0) {
                    i += stackSize;
                }
                return stack[i % stackSize]
            },
            put: function (index, value) {
                let i = sp - Math.floor(index);
                while (i < 0) {
                    i += stackSize;
                }
                stack[i % stackSize] = value
            },
            sp: function () {
                return sp
            },
        };
    }
}
class ViperCompiler {
    static strip(e) {
        return e.replace(/^\s+/, "")
            .replace(/\s+$/, "")
    }
    static removeCommentsAndLineBreaks(e) {
        return e = (e = (e = e.replace(/\/\/.*/g, " "))
            .replace(/\n/g, " "))
            .replace(/\/\*.*?\*\//g, " ")
    }
    static is2NumberArray(e) {
        return Array.isArray(e) && 2 === e.length && "number" == typeof e[0] && "number" == typeof e[1]
    }
    static applyPostfixTemplate(e) {
        return `return function(t, i, stack, window, extra) { ${e.exp} };`
    }

    static postfixToInfix(e) {
        e = (e = ViperCompiler.removeCommentsAndLineBreaks(e))
            .replace(/(\r\n|\r|\n|\t| )+/gm, " ");
        let t = ViperCompiler.strip(e)
            .split(" "),
            a = [];
        for (let s = 0; s < t.length; ++s) {
            let r = t[s];
            switch (r.toLowerCase()) {
                case ">":
                    a.push("var v1 = stack.pop();"), a.push("var v2 = stack.pop();"), a.push("stack.push((v1 < v2) ? 0xFFFFFFFF : 0);");
                    break;
                case "<":
                    a.push("var v1 = stack.pop();"), a.push("var v2 = stack.pop();"), a.push("stack.push((v1 > v2) ? 0xFFFFFFFF : 0);");
                    break;
                case "=":
                    a.push("var v1 = stack.pop();"), a.push("var v2 = stack.pop();"), a.push("stack.push((v2 == v1) ? 0xFFFFFFFF : 0);");
                    break;
                case "drop":
                    a.push("stack.pop();");
                    break;
                case "dup":
                    a.push("stack.push(stack.pick(0));");
                    break;
                case "swap":
                    a.push("var a1 = stack.pop();"), a.push("var a0 = stack.pop();"), a.push("stack.push(a1);"), a.push("stack.push(a0);");
                    break;
                case "pick":
                    a.push("var a0 = stack.pop();"), a.push("stack.push(stack.pick(a0));");
                    break;
                case "put":
                    a.push("var a0 = stack.pop();"), a.push("var a1 = stack.pick(0);"), a.push("stack.put(a0, a1);");
                    break;
                case "abs":
                case "sqrt":
                case "round":
                case "tan":
                case "log":
                case "exp":
                case "sin":
                case "cos":
                case "floor":
                case "ceil":
                case "int":
                    a.push("var a0 = stack.pop();"), a.push("stack.push(" + r + "(a0));");
                    break;
                case "max":
                case "min":
                case "pow":
                    a.push("var a0 = stack.pop();"), a.push("var a1 = stack.pop();"), a.push("stack.push(" + r + "(a1, a0));");
                    break;
                case "random":
                    a.push("stack.push(" + r + "());");
                    break;
                case "/":
                case "+":
                case "-":
                case "*":
                case "%":
                case ">>":
                case "<<":
                case "|":
                case "&":
                case "^":
                case "&&":
                case "||":
                    a.push("var a1 = stack.pop();"), a.push("var a0 = stack.pop();"), a.push("stack.push((a0 " + r + " a1) | 0);");
                    break;
                case "~":
                    a.push("var a0 = stack.pop();"), a.push("stack.push(~a0);");
                    break;
                default:
                    a.push("stack.push(" + r + ");")
            }
        }
        a.push("return stack.pop();");
        let p = ViperCompiler.applyPostfixTemplate({
            exp: a.join("\n")
        });
        return p
    }
    static glitchToPostfix = (function () {
        let e = {
            a: "t",
            b: "put",
            c: "drop",
            d: "*",
            e: "/",
            f: "+",
            g: "-",
            h: "%",
            j: "<<",
            k: ">>",
            l: "&",
            m: "|",
            n: "^",
            o: "~",
            p: "dup",
            q: "pick",
            r: "swap",
            s: "<",
            t: ">",
            u: "=",
            "/": "//",
            "!": "\n",
            ".": " "
        };
        return function (t) {
            let a = [];
            t = t.replace("glitch://", ""), t = (t = (t = ViperCompiler.removeCommentsAndLineBreaks(t))
                .replace("glitch:", ""))
                .replace(/^[^!]*!/, "");
            for (let s = 0; s < t.length; ++s) {
                let r = !1,
                    p = "",
                    c;
                for (; !r;) {
                    var o;
                    (o = c = t[s]) >= "0" && o <= "9" || o >= "A" && o <= "F" ? (p += c, ++s) : (r = !0, p.length && (--s, c = "0x" + p))
                }
                a.push(e[c] || c)
            }
            return a.join(" ")
        }
    })();
    static makeContext() {
        return {
            console: {
                Math: {
                    log: console.log.bind(console)
                }
            }
        }
    }
    static makeExtra() {
        return {
            mouseX: 0,
            mouseY: 0,
            width: 1,
            height: 1,
            tiltX: 0,
            tiltY: 0,
            compass: 0,
            KSLBank: {}
        }
    }
    static addGlobals(e, t, a = () => !0) {
        return `
          var console = {log(){}, info(){}, error(){}, warn(){}};
          var ${Object.getOwnPropertyNames(e).filter(a).map(a => (e[a], `${a} = ${t}.${a}`)).join(",\n")};
        `;
    }
    static s_fnHeader = (function () {
        let e = {},
            t = new Set(["parseInt", "parseFloat", "Array", "isNaN",]),
            a = e => !t.has(e);
        return Object.getOwnPropertyNames(globalThis)
            .filter(a)
            .forEach(t => {
                e[t] = !0
            }), delete e.Math, delete e.window, `
      {try { (0['constructor']['constructor'].prototype.constructor = '') } catch (e) {}};
      var ${Object.keys(e).sort().join(",\n")};
      ${ViperCompiler.addGlobals(Math, "Math")}
  `
    })();
    static expressionStringToFn(e, t, a) {
        let s = Function("stack", "window", "extra", e),
            r = s(void 0, void 0, void 0),
            p = ViperCompiler.makeContext(),
            c = new WrappingStack,
            o = Object.assign({}, t),
            n = r.call(p, 0, 0, c, p, o);
        "function" == typeof n && (n = (r = r())
            .call(p, 0, 0, c, p, o));
        let i = ViperCompiler.is2NumberArray(n);
        if (a)
            for (let u = 0; u < 1e3; u += 100) {
                let l = r(u, u, c, p, o);
                if ("function" == typeof l && (r = r(), l = 0), !ViperCompiler.is2NumberArray(l) && "number" != typeof l) throw "NaN"
            }
        return {
            f: r,
            array: i
        }
    }
    static compileExpression(e, t, a) {
        let s;
        try {
            3 === t ? e = `
          return function(t, i, stack, window, extra) { 
              ${ViperCompiler.strip(e)};
          }` : (2 === t && (e = ViperCompiler.glitchToPostfix(e), t = 1), e = 1 === t ? ViperCompiler.postfixToInfix(e) : `
            return function(t, i, stack, window, extra) { 
                return ${ViperCompiler.strip(e)};
            }`), e = ViperCompiler.removeCommentsAndLineBreaks(e), s = `${ViperCompiler.s_fnHeader}${e = (e = e.replace(/\bint\b/g, "floor")).replace(/(?:extra\.)?(\w+)/g, function (e, t) { var s, r, p; return s = e, r = a, p = t, Object.prototype.hasOwnProperty.call(r, p) ? "extra." + p : s })}`;
            let r = ViperCompiler.expressionStringToFn(s, a, !0);
            return {
                ...r,
                expression: s
            }
        } catch (p) {
            if (p.stack) {
                let c = /<anonymous>:1:(\d+)/.exec(p.stack);
                if (c) {
                    let o = parseInt(c[1]);
                    console.error(p.stack), console.error(s.substring(0, o), "-----VVVVV-----\n", s.substring(o))
                }
            } else console.error(p, p.stack);
            throw p
        }
    }
}
class ViperProcessor {
    static s_samplers = {
        array: [function (e, t, s, a, l, i, n, r, h, o, $, p) {
            let c = $?.sampleRate || 8e3;
            for (let u = 0; u < p; ++u) {
                let f = s.call(h, l / i, c, n, h, $);
                e[l % e.length] = (255 & f[0]) / 127 - 1, t[l % t.length] = (255 & f[1]) / 127 - 1, ++l
            }
        }, function (e, t, s, a, l, i, n, r, h, o, $, p) {
            let c = $?.sampleRate || 8e3;
            for (let u = 0; u < p; ++u) {
                let f = s.call(h, l / i, c, n, h, $);
                e[l % e.length] = Number.isNaN(f[0]) ? 0 : f[0], t[l % t.length] = Number.isNaN(f[1]) ? 0 : f[1], ++l
            }
        }, function (e, t, s, a, l, i, n, r, h, o, $, p) {
            let c = $?.sampleRate || 8e3;
            for (let u = 0; u < p; ++u) {
                let f = s.call(h, l / i, c, n, h, $);
                int8[0] = f[0], e[l % e.length] = int8[0] / 128, int8[0] = f[1], t[l % t.length] = int8[0] / 128, ++l
            }
        },],
        twoChannels: [function (e, t, s, a, l, i, n, r, h, o, $, p) {
            let c = $?.sampleRate || 8e3;
            for (let u = 0; u < p; ++u) e[l % e.length] = (255 & s.call(h, l / i, c, n, h, $)) / 127 - 1, t[l % t.length] = (255 & a.call(o, l / i, c, r, o, $)) / 127 - 1, ++l
        }, function (e, t, s, a, l, i, n, r, h, o, $, p) {
            let c = $?.sampleRate || 8e3;
            for (let u = 0; u < p; ++u) {
                let f = s.call(h, l / i, c, n, h, $);
                e[l % e.length] = Number.isNaN(f) ? 0 : f;
                let m = a.call(o, l / i, c, r, o, $);
                t[l % t.length] = Number.isNaN(m) ? 0 : m
            }
        }, function (e, t, s, a, l, i, n, r, h, o, $, p) {
            let c = $?.sampleRate || 8e3;
            for (let u = 0; u < p; ++u) int8[0] = s.call(h, l / i, c, n, h, $), e[l % e.length] = int8[0] / 128, int8[0] = a.call(o, l / i, c, r, o, $), t[l % t.length] = int8[0] / 128, ++l
        },],
        oneChannel: [function (e, t, s, a, l, i, n, r, h, o, $, p) {
            let c = $?.sampleRate || 8e3;
            for (let u = 0; u < p; ++u) e[l % e.length] = (255 & s.call(h, l / i, c, n, h, $)) / 127 - 1, ++l
        }, function (e, t, s, a, l, i, n, r, h, o, $, p) {
            let c = $?.sampleRate || 8e3;
            for (let u = 0; u < p; ++u) {
                let f = s.call(h, l / i, c, n, h, $);
                e[l % e.length] = Number.isNaN(f) ? 0 : f, ++l
            }
        }, function (e, t, s, a, l, i, n, r, h, o, $, p) {
            let c = $?.sampleRate || 8e3;
            for (let u = 0; u < p; ++u) int8[0] = s.call(h, l / i, c, n, h, $), e[l % e.length] = int8[0] / 128, ++l
        },]
    };
    static interpolate(e, t) {
        let s = 0 | t,
            a = e[s % e.length],
            l = e[(s + 1) % e.length];
        return a + (l - a) * (t % 1)
    }
    static trunc(e, t) {
        return e[(0 | t) % e.length]
    }
    constructor() {
        this.stopped = true;
        this.buffer0 = new Float32Array(4096), this.buffer1 = new Float32Array(4096), this.desiredSampleRate = 8e3, this.dstSampleCount = 0, this.srcSampleCount = 0, this.expandMode = 0, this.type = 0, this.expressionType = 0, this.functions = [{
            f: function () {
                return 0
            },
            array: !1
        },], this.contexts = [ViperCompiler.makeContext(), ViperCompiler.makeContext()], this.expressions = ["Math.sin(t) * 0.1"], this.extra = ViperCompiler.makeExtra(), this.stacks = [new WrappingStack, new WrappingStack]
    }
    reset() {
        this.dstSampleCount = 0, this.srcSampleCount = 0
    }
    play() { this.stopped = false; }
    pause() { this.stopped = true; }
    stop() { this.reset(); this.stopped = true; }
    setExtra(e) {
        Object.assign(this.extra, e)
    }
    getTime() {
        return this.convertToDesiredSampleRate(this.dstSampleCount)
    }
    recompile() {
        this.setExpressions(this.getExpressions())
    }
    convertToDesiredSampleRate(e) {
        return Math.floor(e * this.desiredSampleRate / this.actualSampleRate)
    }
    setActualSampleRate(e) {
        this.actualSampleRate = e
    }
    setDesiredSampleRate(e) {
        this.desiredSampleRate = e
    }
    getDesiredSampleRate() {
        return this.desiredSampleRate
    }
    setExpressionType(e) {
        this.expressionType = e
    }
    setExpressions(e) {
        this.functions = e.map(e => ViperCompiler.expressionStringToFn(e, {}, !1))
    }
    getExpressionType() {
        return this.expressionType
    }
    setType(e) {
        this.type = e
    }
    getType() {
        return this.type
    }
    getNumChannels() {
        let e = (this.functions[1] || {})
            .f;
        return this.functions[0].array || e ? 2 : 1
    }
    process(e, t, s) {
        if (this.stopped == true) { return; }
        let a = this.convertToDesiredSampleRate(this.dstSampleCount),
            l = this.convertToDesiredSampleRate(this.dstSampleCount + e) + 2,
            i = l - a;
        this.buffer0.length < i && (this.buffer0 = new Float32Array(i), this.buffer1 = new Float32Array(i));
        let n = this.functions[0].f,
            r = this.functions[0].array,
            h = (this.functions[1] || {})
                .f,
            o = this.stacks[0],
            $ = this.stacks[1],
            p = this.contexts[0],
            c = this.contexts[1],
            u = this.buffer0,
            f = r || h ? this.buffer1 : u,
            m = this.extra,
            _ = 3 === this.expressionType ? this.getDesiredSampleRate() : 1,
            d = Math.max(this.srcSampleCount, a),
            S = r ? ViperProcessor.s_samplers.array : h ? ViperProcessor.s_samplers.twoChannels : ViperProcessor.s_samplers.oneChannel,
            g = S[this.type];
        g(u, f, n, h, d, _, o, $, p, c, m, l - d);
        let R = this.dstSampleCount * this.desiredSampleRate / this.actualSampleRate,
            x = this.desiredSampleRate / this.actualSampleRate,
            y = this.expandMode ? ViperProcessor.interpolate : ViperProcessor.trunc;
        if (s)
            for (let C = 0; C < e; ++C) t[C] = y(u, R), s[C] = y(f, R), R += x;
        else {
            let T = 0;
            for (let B = 0; B < e; ++B) t[2 * B] = y(u, T), t[2 * B + 1] = y(f, T), T += x
        }
        this.dstSampleCount += e
    }
    getSampleForTime(e, t, s, a = 0) {
        let l = 3 === this.expressionType ? this.getDesiredSampleRate() : 1,
            i = 0;
        try {
            if (this.functions[0].array) {
                let n = this.functions[0].f(e / l, a, s, t, this.extra);
                i = n[a]
            } else this.functions[1] || (a = 0), i = this.functions[a].f(e / l, a, s, t, this.extra);
            switch (this.type) {
                case 0:
                    return (255 & i) / 127 - 1;
                case 1:
                    return i;
                case 2:
                    return int8[0] = i, int8[0] / 128;
                default:
                    return 0
            }
        } catch (r) {
            return console.error(r), 0
        }
    }
}
class ViperEngineNode extends AudioWorkletNode {
    // Enums
    static RendererType = {
        Byte: 0,
        Float: 1,
        SignedByte: 2
    }
    static ExpressionType = {
        Infix: 0,
        PostFix: 1,
        Glitch: 2,
        Function: 3,
    }

    // Worklet Processing
    static WorkletModule = CompileWorker(`
        const int8 = new Int8Array(1);
        ${Librarify(WrappingStack, ViperCompiler, ViperProcessor)}
        class ViperProcessingUnit extends AudioWorkletProcessor {
            static get parameterDescriptors() {
                return [{
                    name: "sampleRate",
                    defaultValue: 8e3
                }]
             }
             constructor() {
                 super(), this.engine = new ViperProcessor, this.port.onmessage = e => {
                     let {
                         cmd: t,
                         data: s
                     } = e.data, a = this[t];
                     if (a) a.call(this, s);
                     else throw Error(\`unknown command: '\${t}'\`)
                 }
             }
             setExtra(e) { this.engine.setExtra(e) }
             callFunc({fn: e,args: t}) { this.engine[e].call(this.engine, ...t) }
             setExpressions(e) { this.engine.setExpressions(e) }
             setExpressionsAndResetToZero(e) { this.engine.reset(), this.engine.setExpressions(e), this.engine.reset() }
             process(e, t, s) { return this.engine.process(t[0][0].length, t[0][0], t[0][1]), !0 }
        }
        registerProcessor("viperengine-processingunit", ViperProcessingUnit);
    `);

    static async setup(context) {
        return context.audioWorklet.addModule(ViperEngineNode.WorkletModule);
    }

    constructor(context) {
        super(context, "viperengine-processingunit", { outputChannelCount: [2] });

        if (typeof window !== undefined) {

        }

        this.expressions = [];
        this.extra = ViperCompiler.makeExtra();
        this.time = 0;
        this.startTime = performance.now();
        this.pauseTime = this.startTime;
        this.connected = false;
        this.running = false;

        this.sampleRate = 8e3;
        this.expressionType = 0;
        this.type = 0;
        this.#callFunc('setActualSampleRate', context.sampleRate)
    }
    #sendExtra(data) {
        this.port.postMessage({
            cmd: 'setExtra',
            data
        });
    }
    #callFunc(fnName, ...args) {
        this.port.postMessage({
            cmd: 'callFunc',
            data: {
                fn: fnName,
                args
            }
        });
    }
    connect(destination) {
        super.connect(destination);
        if (!this.connected) {
            this.connected = true;
            const ept = performance.now() - this.pauseTime;
            this.startTime += ept;
        }
    }
    disconnect() {
        if (this.connected) {
            this.connected = false;
            this.pauseTime = performance.now();
            super.disconnect();
        }
    }
    reset() {
        this.#callFunc('reset');
        this.startTime = performance.now();
        this.pauseTime = this.startTime;
    }
    play() {
        this.#callFunc('play');
        this.running = true;
    }
    pause() {
        this.#callFunc('pause');
        this.running = false;
    }
    stop() {
        this.#callFunc('stop');
        this.running = false;
    }
    isConnected() {
        return this.connected;
    }
    isRunning() {
        return this.running
    }
    getTime() {
        const time = (this.connected && this.running) ? performance.now() : this.pauseTime;
        return (time - this.startTime) * 0.001 * this.desiredSampleRate | 0;
    }
    setExpressions(expressions, resetToZero) {
        const compileExpressions = (expressions, expressionType, extra) => {
            const funcs = [];
            try {
                for (let i = 0; i < expressions.length; ++i) {
                    const exp = expressions[i];
                    if (exp !== this.expressions[i]) {
                        funcs.push(ViperCompiler.compileExpression(exp, expressionType, extra));
                    } else {
                        if (this.functions[i]) {
                            funcs.push(this.functions[i]);
                        }
                    }
                }
            } catch (e) {
                if (e.stack) {
                    const m = /<anonymous>:1:(\d+)/.exec(e.stack);
                    if (m) {
                        const charNdx = parseInt(m[1]);
                        console.error(e.stack);
                        console.error(expressions.join('\n')
                            .substring(0, charNdx), '-----VVVVV-----\n', expressions.substring(charNdx));
                    }
                } else {
                    console.error(e, e.stack);
                }
                throw e;
            }
            return funcs;
        };
        const funcs = compileExpressions(expressions, this.expressionType, this.extra);
        if (!funcs) {
            return;
        }
        this.expressions = expressions.slice(0);
        this.functions = funcs;
        const exp = funcs.map(({
            expression
        }) => expression);
        this.port.postMessage({
            cmd: resetToZero ? 'setExpressionsAndResetToZero' : 'setExpressions',
            data: exp,
        });
        if (resetToZero) {
            this.reset();
        }
    }
    convertToDesiredSampleRate(rate) {
        return Math.floor(rate * this.desiredSampleRate / this.actualSampleRate);
    }
    setDesiredSampleRate(rate) {
        this.#callFunc('setDesiredSampleRate', rate);
        this.desiredSampleRate = rate;
    }
    getDesiredSampleRate() {
        return this.desiredSampleRate;
    }
    setExpressionType(type) {
        this.expressionType = type;
        this.#callFunc('setExpressionType', type);
    }
    getExpressions() {
        return this.expressions.slice();
    }
    getExpressionType() {
        return this.expressionType;
    }
    setType(type) {
        this.type = type;
        this.#callFunc('setType', type);
    }
    getType() {
        return this.type;
    }
    getNumChannels() {
        return this.channelCount;
    }
}