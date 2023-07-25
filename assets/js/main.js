/*
    ViperStudio
    By Ali Poyraz AYDIN (KIGIPUX)
*/

void async function() {
    // A helper function to make my writing easier:
    const ce = (n) => document.createElement(n);

    // Event System
    window.GLOB = {events:{},on:function(event,callback){var handlers = this.events[event]||[];handlers.push(callback);this.events[event]=handlers;},trigger:function(event,data){var handlers=this.events[event];if(!handlers||handlers.length<1)return;handlers.forEach(handler=>handler(data))}};

    // Main Elements
    let PlayingState = false;
    let SampleRate = 32000;
    let CodeType = 0;
    let RendererType = 2;

    // Setting it up;
    let mContext = new AudioContext();
    mContext.resume();  // needed for safari
    let aContext = new AudioContext();
    aContext.resume();  // needed for safari
    await ViperEngineNode.setup(aContext);
    let bNode = new ViperEngineNode(aContext);
    bNode.setType(RendererType);
    bNode.setExpressionType(CodeType);
    bNode.setDesiredSampleRate(SampleRate);

    let aAnalL = aContext.createAnalyser(),
        aAnalR = aContext.createAnalyser();
    
    aAnalL.fftSize = 32768;
    aAnalR.fftSize = 32768;

    let aDataArrL = new Float32Array(aAnalL.fftSize),
        aDataArrR = new Float32Array(aAnalR.fftSize);

    let aSplitter = aContext.createChannelSplitter(2);
    let aMerger = aContext.createChannelMerger(2);

    aMerger.connect(aContext.destination);
    aSplitter.connect(aMerger,0,0);
    aSplitter.connect(aMerger,1,1);
    aSplitter.connect(aAnalL, 0);
    aSplitter.connect(aAnalR, 1);

    bNode.connect(aSplitter);

    // UI
    const cElement = ce("canvas").with({width:140, height:30});
    const cContext = cElement.getContext('2d');

    function visualize() {
        aAnalL.getFloatTimeDomainData(aDataArrL);
        aAnalR.getFloatTimeDomainData(aDataArrR);
        const fftData1 = [],
              fftData2 = [];
        const fftSize = 840;
        for (let i = 0; i < fftSize; i++){
            const x = Math.map(i, 0, fftSize, -1, 1),
                  l = aDataArrL[i + aAnalL.fftSize - fftSize],
                  r = aDataArrR[i + aAnalR.fftSize - fftSize];
            fftData1[i] = l;
            fftData2[i] = r;
        }
        cContext.globalCompositeOperation = 'source-over';
        cContext.fillStyle = 'rgba(0,0,0,0.3)';
        cContext.fillRect(0, 0, cContext.canvas.width, cContext.canvas.height);

        cContext.globalCompositeOperation = 'lighter';
        cContext.strokeStyle = 'rgb(100%, 50%, 0%)';
        cContext.lineWidth = 1;
        cContext.beginPath();
        for (let i = 0; i < fftData1.length; i++) {
            cContext.lineTo(Math.map(i, 0, fftData1.length, 0, cContext.canvas.width), Math.map(fftData1[i], -1, 1, cContext.canvas.height, 0));
        }
        cContext.stroke();
        cContext.strokeStyle = 'rgb(0%, 50%, 100%)';
        cContext.beginPath();
        for (let i = 0; i < fftData2.length; i++) {
            cContext.lineTo(Math.map(i, 0, fftData2.length, 0, cContext.canvas.width), Math.map(fftData2[i], -1, 1, cContext.canvas.height, 0));
        }
        cContext.stroke();
        cContext.globalCompositeOperation = 'source-over';
        cContext.strokeStyle = '#FF86C7';
        cContext.beginPath();
        for (let i = 0; i < fftData2.length; i++) {
            cContext.lineTo(Math.map(i, 0, fftData2.length, 0, cContext.canvas.width), Math.map(((fftData1[i]+fftData2[i]) / 2), -1, 1, cContext.canvas.height, 0));
        }
        cContext.stroke();
        requestAnimationFrame(visualize);
    }

    visualize();

    let ExpressionSet = function(i, ...b) {
        try { bNode.setExpressions([...b], i); R.viperErrorBar.innerText = "✅ No errors found." } catch(e){
            R.viperErrorBar.innerText = "❌ Error: " + e.message;
        }
    }
    GLOB.on("codeChanged", e => {ChannelTextbox.TextControl.value = e; ChannelTextbox.TextControl.dispatchEvent(new Event("input")); ExpressionSet(true,e)});

    let RendererTypeDropdown = UI.createDropdown(null, [
        {html:"Byte", value:"0"},
        {html:"Float", value:"1"},
        {html:"Signed Byte", value:"2", default:true}
    ]).onto(e => e.addEventListener("change", x => (GLOB.trigger("rendererTypeChanged", parseInt(x.target.value)))));

    let PlaybackRateDropdown = UI.createDropdown(null, [
        {html:"8KHz", value:"8000"},
        {html:"10KHz", value:"10000"},
        {html:"16KHz", value:"16000"},
        {html:"24KHz", value:"24000"},
        {html:"32KHz", value:"32000", default:true},
        {html:"41KHz", value:"41000"},
        {html:"44KHz", value:"44100"},
        {html:"48KHz", value:"48000"}
    ]).onto(e => e.addEventListener("change", x => (GLOB.trigger("sampleRateChanged", parseInt(x.target.value)))));
    
    let CodeTypeDropdown = UI.createDropdown(null, [
        {html:"Javascript Infix", value:"0"},
        {html:"Javascript Function", value:"3"},
        {html:"Polish Postfix (RPN)", value:"1"},
        {html:"Glitch Machine", value:"2"}
    ]).onto(e => e.addEventListener("change", x => (GLOB.trigger("codeTypeChanged", parseInt(x.target.value)))));
    
    let PlayButton = UI.createButton("Play").onto(e => {
        e.addEventListener("click", x => {
            if (aContext.state !== "running") aContext.resume();
            PlayingState = !PlayingState;
            GLOB.trigger("playStateChanged", PlayingState);
            x.target.innerHTML = PlayingState ? "Pause" : "Play";
        })
    });
    let StopButton = UI.createButton("Stop").onto(e => {
        e.addEventListener("click", x => {
            PlayingState = false;
            bNode.stop();
            PlayButton.innerHTML = "Play";
        });
        
    });

    let ChannelTextbox = kitode.create().onto(e => {
        e.TextControl = e.querySelector("textarea.kitode-input");
        e.TextControl.value = '// Slow down the time to hit the sweet fidelity spot.\n// You can delete this and set sample rate to 8KHz to \n// achive low fidelity.\nt = t / 4,\n\n// This is the sequence. goes like "Tap, Rim, Snare, Snare, Tap, Rim, Snare, Rim"\nn = [0,1,2,2,0,1,2,1],\n\n// This is the algorithm to tie up the time to our sequence.\nf=n[floor((t%14664)/1833)],\n\n\n// This is the output, checks the value F and switches to the instrument.\n// Instruments are in sync with the time and the sequence.\n\n/*  Tap  */ ((f==0) ? ((t%1833)*3.15&16)*(  (((t%1833)<325) ? (-3.15*(t%1833)>>6)+16 : 0) * 3.2 /16) : 0 +\n/*  Rim  */ (f==1) ? ((t%1833)*6.3&16)*(  (((t%1833)<163) ? (-6.3*(t%1833)>>6)+16 : 0) * 3.2 /16) : 0 +\n/* Snare */ (f==2) ? random()*51.2*(((t%1833)<1449) ? 1536/((t%1833)+1024)-.5 : 0) : 0)';
        e.TextControl.dispatchEvent(new Event("input"));

        const ev = a => { ExpressionSet(false, e.TextControl.value) };
        e.EnableRealtimeCompile = () => { e.TextControl.addEventListener("input", ev) }
        e.DisableRealtimeCompile = () => { e.TextControl.removeEventListener("input", ev) }

        e.EnableRealtimeCompile();
        ev();
        
        R.viperContent.appendChild(e);
    });

    let CompileButton = UI.createButton("Compile").onto(e => {
        e.addEventListener("click", x => ExpressionSet(true, ChannelTextbox.TextControl.value));
    });

    let ResetButton = UI.createButton("Reset").onto(e => {
        e.addEventListener("click", x => bNode.reset());
    });

    let RealtimeCompileCheckbox = UI.createButton("✅ Real-time Compiling").onto(e => {
        e.state = true;
        e.addEventListener("click", x => {
            x.target.state = !x.target.state;
            ChannelTextbox[x.target.state ? "EnableRealtimeCompile" : "DisableRealtimeCompile"]()
            x.target.innerHTML = (x.target.state ? "✅" : "❌") + " Real-time Compiling";
        });
    });

    // Render Elements
    R.viperContentBar.render(RendererTypeDropdown, PlaybackRateDropdown, CodeTypeDropdown,
                            UI.createSeperator(), CompileButton, PlayButton, StopButton, ResetButton,
                            UI.createSeperator(), RealtimeCompileCheckbox,
                            UI.createSeperator(), cElement);

    let AboutButton = UI.createMenuButton("About", function(e){
        document.body.appendChild(document.createElement("div").onto(l => {
            l.innerHTML = `<div class="sector"><img src="assets/mmc/viperstudio-logo.png" alt="ViperStudio Logo"><hr/><p>
            ViperStudio, is a GUI made for ViperEngine Library to create music with code.<br>
            ViperEngine is a renderer library for music with code libraries such as Bytebeat, Floatbeat and much more with various expression styles.<br><br>
            Made by Ali Poyraz AYDIN (KIGIPUX), inspired by DollChan's Bytebeat and BattleOfTheBits.<br><br>
            <span style="font-family:monospace;font-size:13px;">( Press anywhere to close this section )</span>
            </p></div>`;
            l.id = "about";
            l.addEventListener("click", () => {l.classList.add("closing"); setTimeout(() => l.remove(),500)});
        }));
    });

    R.viperTopbar.render(AboutButton);

    // Event Handler
    GLOB.on("playStateChanged", e => {PlayingState = e; bNode[(e ? "play" : "pause")]()});
    GLOB.on("sampleRateChanged", e => {SampleRate = e; PlaybackRateDropdown.value = e; bNode.setDesiredSampleRate(e)});
    GLOB.on("codeTypeChanged", e => {CodeType = e; CodeTypeDropdown.value = e; bNode.setExpressionType(e)});
    GLOB.on("rendererTypeChanged", e => {RendererType = e; RendererTypeDropdown.value = e; bNode.setType(e)});


    // Get Presets
    let presets = await (await fetch("presets.json")).json();

    let presetLoad = l => {
        GLOB.trigger("sampleRateChanged", l.samp);
        GLOB.trigger("codeTypeChanged", l.ct);
        GLOB.trigger("rendererTypeChanged", l.type);
        GLOB.trigger("codeChanged", l.code);
    }

    let presetCreate = (b,r,u,h) => {
        return btoa(JSON.stringify({type:b,samp:r,ct:u,code:h}));
    }
    window.presetCreateCurrent = () => {
        return presetCreate(RendererType,SampleRate,CodeType,bNode.getExpressions()[0]);
    }

    if (window.location.hash) presetLoad(JSON.parse(atob(window.location.hash.substring(1))));
    window.addEventListener("hashchange", x => {
        presetLoad(JSON.parse(atob(window.location.hash.substring(1))))
    });

    presets.forEach(e => {
        R.viperPresets.appendChild(ce("div").onto(a => {
            a.classList.add("viper-preset");
            a.appendChild(ce("span").onto(u => {
                u.classList.add("stitle");
                u.innerText = e.name;
                u.mediaInfo = e;
                u.addEventListener("click", (x) => presetLoad(x.target.mediaInfo));
            }));
            a.appendChild(ce("div").onto(u => {
                u.appendChild(ce("span").onto(o => {
                    o.classList.add("author");
                    o.innerText = e.author;
                }));
                u.appendChild(ce("div").onto(o => {
                    o.classList.add("type");
                    o.innerText = (e.type == 0 ? "Byte" : e.type == 1 ? "Float" : "Signed Byte") + " / " + (e.ct == 0 ? "Infix" : e.ct == 1 ? "Postfix" : e.ct == 2 ? "Glitch" : "Function");
                }));
            }))
        }));
    });
} ();
