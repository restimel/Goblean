(function() {
    'use strict';

    const authors = ['Gilles Masclef (Le Gobelin)', 'Benoît Mariat',
    'Anthony Oliveira', 'Clément Chrétien', 'Clotilde Masclef',
    'Rodolphe Peccatte', 'Charlotte Gros', 'Pierre Gaudé'];

    const winMessages = [
        'The champion is %(name)s',
        '%(name)s kicks off %(nameLoser)s',
        'The victory is for %(name)s',
        '%(nameLoser)s has been humilitaed by %(name)s!'
    ];

    let supportMediaDevice = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    if (supportMediaDevice) {
        navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}}).then(stream => {
            stream.getVideoTracks().forEach(mediaStreamTrack => mediaStreamTrack.stop());
            supportMediaDevice = true;
        }).catch(() => supportMediaDevice = false);
    }

    const mode = {
        autoFight: false,
        autoCreationSelect: true,
        fightMode: 'versus',
        timerAutoCapture: 1100,
        pictureSize: 300
    };

    const views = {
        main: document.getElementById('main-view'),
    // addFighter: document.getElementById('add-fighter'),
        battle: document.getElementById('battle'),
        rules: document.getElementById('rules'),
        credits: document.getElementById('credits'),
        stats: document.getElementById('stats'),
        createGoblean: document.getElementById('step-creation'),
        configuration: document.getElementById('options-configuration'),
    };

    const mainEls = {
        readyFight: document.getElementById('ready-fight'),
        messageText: document.querySelector('.text-message'),
        battleHistoric: document.querySelector('.battle-historic'),
        lastLogs: document.querySelector('.last-logs'),
        attackChoice: document.querySelector('.attack-choice'),
        modeAuto: document.getElementById('mode-auto'),
        readyBtn: document.getElementById('battle-ready'),
        endBtn: document.getElementById('battle-end'),
        winner: document.getElementById('winner'),
        fighter1: document.querySelector('.fighter1'),
        fighter2: document.querySelector('.fighter2'),
        fighter1Ready: document.querySelector('.ready1'),
        fighter2Ready: document.querySelector('.ready2'),
        choice1: document.querySelector('.choice1'),
        choice2: document.querySelector('.choice2'),
        choice3: document.querySelector('.choice3'),
        choice4: document.querySelector('.choice4'),
        attackResult: document.querySelector('.attack-result'),
        gobleanList: document.getElementById('goblean-list'),
        statCode: document.querySelector('.stat-code'),
        statTitle: document.querySelector('.stat-title'),
        statNbf: document.querySelector('.stat-nbf'),
        statNbw: document.querySelector('.stat-nbw'),
        statRatio: document.querySelector('.stat-ratio'),
        statPicture: document.querySelector('.stat-picture'),
        editGoblean: document.querySelector('.edit-goblean'),
        deleteGoblean: document.querySelector('.delete-goblean'),
        warningDeletion: document.getElementById('warning-deletion'),
        localeChooser: document.querySelector('.locale-chooser'),
        locale: document.querySelector('.locale'),
        videoSection: document.getElementById('video-section'),
        createGobleanSection: document.querySelector('#step-creation'),
        createGobleanTitle: document.querySelector('#step-creation .title'),
        createGobleanMessage: document.querySelector('#step-creation .message'),
        gobleanCreationName: document.querySelector('.name-goblean-creation'),
        gobleanCreationCode: document.querySelector('.code-goblean-creation'),
        gobleanCreationSideContent: document.querySelector('.side-content'),
    };

    const viewStack = [];

    const fighters = [];
    let currentFighter;

    function save() {
        localStorage.setItem('fighter1', JSON.stringify(fighters[0]));
        localStorage.setItem('fighter2', JSON.stringify(fighters[1]));

        fighters[0].save();
        fighters[1].save();
    }

    function animationElement(elements, show = 1, callback = function() {}) {
        let opacity = show === 1 ? 0 : 1;
        const inc = show === 1 ? 0.07 : -0.07;

        if (!elements[Symbol.iterator]) {
            elements = [elements];
        }

        function animation() {
            opacity += inc;
            if (opacity <= 0 || opacity >= 1) {
                for (let el of elements) {
                    el.style.opacity = '';
                }
                callback();
                return;
            }

            for (let el of elements) {
                el.style.opacity = opacity;
            }

            requestAnimationFrame(animation);
        }

        animation();
    }

    function setView(view, animate, stack = false) {
        const elViews = document.querySelectorAll('.view.active');
        const oldView = viewStack[viewStack.length - 2];
        let opacity = 1;

        function hide() {
            for (let elView of elViews) {
                elView.classList.remove('active');
                elView.classList.remove('old-active');
                elView.style.opacity = '';
            }
        }

        if (!view) {
            view = oldView;
            viewStack.pop();
            if (!view) view = 'main';
        } else {
            if (stack || !viewStack.length) {
                viewStack.push( view);
            } else {
                viewStack[viewStack.length - 1] = view;
            }
        }

        views[view].classList.add('active');

        if (animate) {
            for (let elView of elViews) {
                elView.classList.add('old-active');
            }
            animationElement(elViews, -1, hide);
        } else {
            hide();
        }
    }

    function setMessage(text, addHistoricLog = false, keepI18n = false) {
        mainEls.attackChoice.classList.remove('active');
        mainEls.messageText.classList.add('active');
        if (keepI18n) {
            mainEls.messageText.dataset.i18n = text;
            text = _(text);
        } else {
            delete mainEls.messageText.dataset.i18n;
        }
        mainEls.messageText.textContent = text;

        if (addHistoricLog) {
            addHistoric(text);
        }
    }

    function setChoice(list) {
        if (!list[0]) {
            mainEls.messageText.classList.remove('active');
        } else {
            mainEls.messageText.classList.add('active');
            mainEls.messageText.textContent = list[0];
        }

        if (mode.autoFight) {
            let choice = Math.ceil(Math.random() * 4);
            setMessage(_('%(name)s will attack with %(choice)s', {
                name: currentFighter.name,
                choice: list[choice]
            }));
            setTimeout(() => {
                mainEls['choice' + choice].onclick();
            }, 1000);
            return;
        }

        mainEls.attackChoice.classList.add('active');
        mainEls.choice1.textContent = list[1];
        mainEls.choice2.textContent = list[2];
        mainEls.choice3.textContent = list[3];
        mainEls.choice4.textContent = list[4];
    }

    function fillList(element, options) {
        let {callback, selected, addFirstItem} = options;

        let list = JSON.parse(localStorage.getItem('fighters') || '[]');
        list.sort((a, b) => b.nbw - a.nbw);

        if (list.length === 0) {
            list.push({name: _('no Goblean fighters yet'), nbw: 0, nbf: 0, code: 0, picture: ''});
        }

        if (selected === true) {
            selected = list[0];
        }

        if (addFirstItem) {
            list.unshift(addFirstItem);
        }

        if (typeof selected !== 'object') {
            selected = {};
        }

        element.innerHTML = '';

        for (let goblean of list) {
            let el = document.createElement('div');
            el.textContent = goblean.name;
            el.onclick = callback(goblean);

            if (selected.code === goblean.code) {
                //select the first item
                el.onclick();
            }

            element.appendChild(el);
        }
    }

    function addHistoric(text) {
        var li = document.createElement('li');
        li.textContent = text;
        mainEls.lastLogs.appendChild(li);
        li.scrollIntoView();
    }

    function initializeFighter(nb) {
        let fighter = fighters[nb-1];
        currentFighter = fighter;

        let title = nb === 1 ? 'First Goblean fighter' : 'Second Goblean fighter';
        // mainEls.creationTitle.textContent = _(title);
        // mainEls.creationTitle.dataset.i18n = title;

        // mainEls.creationBtnForm.disabled = !fighter.isValid();

        // fillList(mainEls.fighterSelection, {
        //     addFirstItem: {name: _('+ Create a new Goblean')},
        //     callback: function(goblean) { return function() {
        //         document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        //         this.classList.add('selected');

        //         if (!goblean.code) {
        //             mainEls.creationSection.classList.add('active');
        //             mainEls.creationStat.classList.remove('active');

        //             currentFighter = new Fighter(nb);

        //             mainEls.creationName.value = '';
        //             mainEls.creationCode.value = '';
        //             mainEls.creationPicture.src = '';
        //             mainEls.creationBtnForm.disabled = true;
        //         } else {
        //             mainEls.creationSection.classList.remove('active');
        //             mainEls.creationStat.classList.add('active');

        //             currentFighter = new Fighter(nb, goblean);

        //             mainEls.gobleanName.textContent = currentFighter.name || '';
        //             mainEls.gobleanCode.textContent = _.parse('%§', currentFighter.code || '');
        //             mainEls.gobleanPicture.src = currentFighter.picture || '';

        //         }

        //         fighters[nb-1] = currentFighter;
        //     };},
        //     selected: currentFighter
        // });

        initializeStats({
            title: title,
            selected: currentFighter,
            btnOk: _('Select'),
            callback: function(goblean) {
                fighters[nb-1] = goblean;
                goblean.position = nb;
                updateFighter(goblean);
            }
        });
        // setView('stats', true);

        // mainEls.creationPicture.onclick = prepareClickPicture;
        // mainEls.gobleanPicture.onclick = prepareClickPicture;
        // mainEls.creationCode.onfocus = prepareScanCode;
    }

    // function prepareClickPicture() {
    //     let mediaStream = [];
    //     let takeScreenshot = true;
    //     let changePicture = function() {
    //         mainEls.streamHeader.dataset.i18n = 'Picture';
    //         mainEls.streamHeader.textContent = _('Picture');
    //         mainEls.dialogPicture.showModal();
    //         if (supportMediaDevice) {
    //             mainEls.streamVideo.classList.add('active');
    //             mainEls.takePicture.classList.add('active');
    //             mainEls.takePicture.textContent = _('Take picture');
    //             takeScreenshot = true;
    //             navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}}).then(stream => {
    //                 mainEls.streamVideo.src = window.URL.createObjectURL(stream);
    //                 mediaStream = stream.getVideoTracks();
    //             });
    //         } else {
    //             mainEls.streamVideo.classList.remove('active');
    //             mainEls.takePicture.classList.remove('active');
    //         }
    //         mainEls.codeStream.classList.remove('active');
    //         mainEls.fileStream.classList.add('active');
    //         mainEls.streamPicture.classList.remove('active', 'success', 'fail');
    //     };

    //     mainEls.btnCancel.onclick = function() {
    //         mainEls.dialogPicture.close();
    //         mediaStream.forEach(mediaStreamTrack => mediaStreamTrack.stop());
    //     };

    //     mainEls.btnOk.onclick = function() {
    //         currentFighter.picture = mainEls.streamPicture.src;
    //         mainEls.creationPicture.src = mainEls.gobleanPicture.src = currentFighter.picture;
    //         mainEls.btnCancel.onclick();
    //     };

    //     function takePhoto() {
    //         if (takeScreenshot) {
    //             takeScreenshot = false;
    //             mainEls.streamCanvas.getContext('2d').drawImage(mainEls.streamVideo, 0, 0, pictureSize, pictureSize);
    //             let data = mainEls.streamCanvas.toDataURL('image/png');
    //             mainEls.streamPicture.src = data;
    //             mainEls.takePicture.textContent = _('Take again');
    //             mainEls.streamVideo.classList.remove('active');
    //             mainEls.streamPicture.classList.add('active');
    //         } else {
    //             takeScreenshot = true;
    //             mainEls.streamVideo.classList.add('active');
    //             mainEls.streamPicture.classList.remove('active');
    //             mainEls.takePicture.textContent = _('Take picture');
    //         }
    //     };
    //     mainEls.takePicture.onclick = takePhoto;
    //     mainEls.streamVideo.onclick = takePhoto;

    //     mainEls.fileStream.querySelector('input').onchange = function(evt) {
    //         var reader = new FileReader();
    //         reader.onloadend = function(data) {
    //             mainEls.streamPicture.src = data.target.result;
    //             mainEls.streamVideo.classList.remove('active');
    //             mainEls.streamPicture.classList.add('active');
    //             takeScreenshot = false;
    //             mainEls.takePicture.textContent = _('Take picture from camera');
    //         };
    //         reader.readAsDataURL(evt.target.files[0]);
    //     };

    //     changePicture();
    // }

   /* function prepareScanCode() {
        if (!supportMediaDevice) {
            return;
        }

        let mediaStream = [];
        let takeScreenshot = true;

        function getCode() {
            mainEls.dialogPicture.showModal();
            mainEls.streamHeader.dataset.i18n = 'EAN code';
            mainEls.streamHeader.textContent = _('EAN code');
            if (supportMediaDevice) {
                mainEls.streamVideo.classList.add('active');
                mainEls.takePicture.classList.add('active');
                mainEls.takePicture.textContent = _('Scan picture');
                takeScreenshot = true;
                navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}}).then(stream => {
                    mainEls.streamVideo.src = window.URL.createObjectURL(stream);
                    mediaStream = stream.getVideoTracks();
                });
            } else {
                mainEls.streamVideo.classList.remove('active');
                mainEls.takePicture.classList.remove('active');
            }
            mainEls.codeStream.classList.add('active');
            mainEls.streamCode.value = mainEls.creationCode.value;
            mainEls.fileStream.classList.remove('active');
            mainEls.streamPicture.classList.remove('active', 'success', 'fail');
            mainEls.streamCode.focus();
        }

        function scanCode(img) {
            Quagga.decodeSingle({
                decoder: {
                    readers: ["ean_reader"] // List of active readers
                },
                locate: true, // try to locate the barcode in the image
                src: img // or 'data:image/jpg;base64,' + data
            }, function(result){
                if(result && result.codeResult) {
                    console.log("result", result.codeResult.code);
                    mainEls.streamCode.value = result.codeResult.code;
                    mainEls.streamPicture.classList.add('success');
                    mainEls.streamPicture.classList.remove('fail');
                } else {
                    console.log("not detected");
                    mainEls.streamPicture.classList.remove('success');
                    mainEls.streamPicture.classList.add('fail');
                }
            });
        }

        mainEls.btnCancel.onclick = function() {
            mainEls.dialogPicture.close();
            mediaStream.forEach(mediaStreamTrack => mediaStreamTrack.stop());
        };

        mainEls.btnOk.onclick = function() {
            let code = mainEls.streamCode.value;
            mainEls.creationCode.value = code;
            currentFighter.setAttributes({code: code})
            mainEls.creationBtnForm.disabled = !currentFighter.isValid();
            mainEls.btnCancel.onclick();
        };

        function takePhoto() {
            if (takeScreenshot) {
                takeScreenshot = false;
                mainEls.streamCanvas.getContext('2d').drawImage(mainEls.streamVideo, 0, 0, pictureSize, pictureSize);
                let data = mainEls.streamCanvas.toDataURL('image/png');
                mainEls.streamPicture.src = data;
                mainEls.takePicture.textContent = _('Scan again');
                mainEls.streamVideo.classList.remove('active');
                mainEls.streamPicture.classList.add('active');
                scanCode(data);
            } else {
                takeScreenshot = true;
                mainEls.streamVideo.classList.add('active');
                mainEls.streamPicture.classList.remove('active');
                mainEls.takePicture.textContent = _('Scan picture');
            }
        };
        mainEls.takePicture.onclick = takePhoto;
        mainEls.streamVideo.onclick = takePhoto;

        getCode();
    }
    */

    function updateFighter(fighter) {
        var el = mainEls['fighter' + fighter.position];

        el.querySelector('.fighter-name').textContent = fighter.name || '?';

        if (fighter.isValid()) {
            mainEls['fighter' + fighter.position + 'Ready'].classList.add('active');
            fighter.drawPicture(el.querySelector('.fighter-canvas'));

            localStorage.setItem('fighter' + fighter.position, JSON.stringify(fighter));

            if (fighters.every(f => f.isValid())) {
                mainEls.readyBtn.classList.add('active');
            }
        } else {
            mainEls['fighter' + fighter.position + 'Ready'].classList.remove('active');
        }

        setMessage('Awaiting for goblean fighters', false, true);
    }

    // function addToBattle(evt) {
    //     evt.preventDefault();
    //     if (this.disabled) {
    //         return;
    //     }

    //     mainEls.readyFight.classList.add('active');
    //     animationElement(mainEls.readyFight, 1, () => {
    //         setTimeout(() => {
    //             mainEls.readyFight.classList.remove('active');
    //             updateFighter(currentFighter);
    //             setView('battle', true);
    //         }, 600);
    //     });
    // }

    function initializeBattle() {
        fighters[0] = new Fighter(1, localStorage.getItem('fighter1'));
        fighters[1] = new Fighter(2, localStorage.getItem('fighter2'));

        mainEls.fighter1.className = 'fighter fighter1';
        mainEls.fighter2.className = 'fighter fighter2';
        mainEls.winner.className = '';
        mainEls.endBtn.classList.remove('active');
        views.battle.classList.add('preparation');

        mainEls.battleHistoric.classList.remove('active');
        mainEls.lastLogs.classList.remove('active');
        mainEls.lastLogs.innerHTML = '';

        // mainEls.modeOptions.classList.add('active');

        fighters.forEach(updateFighter);

        setView('battle', true, true);
        mainEls.fighter1.onclick = initializeFighter.bind(null, 1);
        mainEls.fighter2.onclick = initializeFighter.bind(null, 2);
        setMessage('Awaiting for goblean fighters', false, true);
    }

    function startFight() {
        mainEls.fighter1.onclick = null;
        mainEls.fighter2.onclick = null;
        views.battle.classList.remove('preparation');
        mainEls.readyBtn.classList.remove('active');
        mainEls.fighter1Ready.classList.remove('active');
        mainEls.fighter2Ready.classList.remove('active');
        mainEls.battleHistoric.classList.add('active');

        addHistoric(_('Start battle between %s and %s', fighters[0].name, fighters[1].name));

        fighters.forEach(f => f.numberOfFight++);

        if (fighters[0].stats.initiative < fighters[1].stats.initiative) {
            attackRound(2);
        } else {
            attackRound(1);
        }
    }

    function attackRound(position) {
        currentFighter = fighters[position-1];

        for(let el of document.querySelectorAll('.currentFighter')) {
            el.classList.remove('currentFighter');
        }

        if (currentFighter.isKo()) {
            setWinner();
            return;
        }

        mainEls['fighter' + position].classList.add('currentFighter');

        setChoice([_('%s will attack', currentFighter.name), ...currentFighter.getChoice()])
    }

    function finishAttack() {
        let otherFighter = fighters[currentFighter.position % 2];
        mainEls.attackResult.classList.remove('active1', 'active2');
        setTimeout(attackRound, 500, otherFighter.position);
    }

    function attackChoice(choice) {
        animationElement(mainEls.attackResult, -1, function() {
            let list = currentFighter.getChoice();
            addHistoric(_('%(name)s will attack with %(choice)s', {
                name: currentFighter.name,
                choice: list[choice]
            }));
            let otherFighter = fighters[currentFighter.position % 2];
            let attack = currentFighter.chooseAttack(choice);
            let dmg = otherFighter.setDamage(attack);
            mainEls.attackResult.textContent = -dmg;
            mainEls.attackResult.classList.add('active' + otherFighter.position);
            setMessage(_('%(name)s has lost %(dmg)i hp', {
                name: otherFighter.name,
                dmg: dmg
            }), true);
            setTimeout(finishAttack, 500);
        });
    }

    function setWinner() {
        let otherFighter = fighters[currentFighter.position % 2];
        mainEls['fighter' + currentFighter.position].classList.add('loser');
        mainEls['fighter' + otherFighter.position].classList.add('winner');
        otherFighter.numberOfWin++;

        save();

        let message = winMessages[Math.floor(Math.random() * winMessages.length)];

        message = _(message, {
            name: otherFighter.name,
            nameLoser: currentFighter.name
        });

        setMessage(message, true);

        mainEls.endBtn.classList.add('active');
        mainEls.winner.classList.add('active' + otherFighter.position);
        animationElement(mainEls.winner, 1);
        return;
    }

    function initializeStats(options) {
        let {
            title = _('Your team'), refresh, selected = true, callback,
            btnOk = _('Ok')
        } = options;

        let currentSelected = null;

        if (refresh !== true) {
            setView('stats', true, true);
        }

        fillList(mainEls.gobleanList, {
            callback: function(goblean) {
                if (goblean.code === -1) {
                    initializeGobleanCreation.callback = (goblean) => {
                        if (mode.autoCreationSelect && typeof callback === 'function') {
                            callback(goblean);
                            setView('', true, false);
                        } else {
                            const opt = {
                                ...options,
                                refresh: true,
                                selected: goblean,

                            };
                            initializeStats(opt);
                        }
                    };
                    return initializeGobleanCreation;
                }

                return function() {
                    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                    this.classList.add('selected');

                    let fighter = new Fighter(0, goblean);

                    let ratio = goblean.nbf ? goblean.nbw / goblean.nbf : 0;
                    ratio = Math.round(ratio * 10000) / 100;

                    mainEls.statTitle.textContent = goblean.name;
                    mainEls.statCode.textContent = _.parse('%§', goblean.code);
                    mainEls.statNbf.textContent = _.parse('%i', goblean.nbf);
                    mainEls.statNbw.textContent = _.parse('%i', goblean.nbw);
                    fighter.drawPicture(mainEls.statPicture);
                    mainEls.statRatio.textContent = ratio + '%';

                    currentSelected = fighter;
                };
            },
            selected: selected,
            addFirstItem: {name: _('+ Enrole a new Goblean'), code: -1}
        });

        let okButton = views.stats.querySelector('.select-goblean');
        if (typeof callback === 'function') {
            okButton.classList.add('active');
            okButton.onclick = () => {
                callback(currentSelected);
                setView('', true, false);
            };
            okButton.textContent = btnOk;
        } else {
            okButton.classList.remove('active');
        }

        mainEls.editGoblean.onclick = () => {
            initializeGobleanCreation(currentSelected);
        };
        mainEls.deleteGoblean.onclick = () => {
            mainEls.warningDeletion.querySelector('header').textContent = _('Do you want to eliminate the Goblean "%s"? All its stats will be removed.', currentSelected.name);
            mainEls.warningDeletion.showModal();
        };
        mainEls.warningDeletion.querySelector('.btn-delete').onclick = () => {
            currentSelected.remove();
            mainEls.warningDeletion.close();
            const opt = {
                ...options,
                refresh: true,
                selected: true,
            };
            initializeStats(opt);
        };
    }

    function prepareVideo(options = {}) {
        let videoActive = true;

        let elem = options.el;
        let {
            picture = null,
            fullVideo = false,
            canvasSize = mode.pictureSize,
            autoCapture = false
        } = options;
        let btnActiveTitle = options.btnActiveTitle || _('Take picture');
        let btnInactiveTitle = options.btnInactiveTitle || _('Take again');
        let btnFromCameraTitle = options.btnFromCameraTitle || _('Take picture from camera');

        let streamVideo = elem.querySelector('.stream-video');
        let streamCanvas = elem.querySelector('.stream-canvas');
        let streamPicture = elem.querySelector('.picture-temp');
        let takePicture = elem.querySelector('.take-picture');
        let fileStream = elem.querySelector('.file-stream');
        let codeStream = elem.querySelector('.code-stream');
        let streamCode = elem.querySelector('.code-stream input');

        function initializeVideo() {
            prepareVideo.stopVideo();

            streamVideo.classList.toggle('active', supportMediaDevice);
            takePicture.classList.toggle('active', supportMediaDevice);

            streamCanvas.width = canvasSize;
            streamCanvas.height = canvasSize;

            if (supportMediaDevice) {
                takePicture.textContent = btnActiveTitle;
                takePicture.dataset.i18n = btnActiveTitle;
                videoActive = true;
                navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}}).then(stream => {
                    streamVideo.src = window.URL.createObjectURL(stream);
                    mediaStream = stream.getVideoTracks();
                });
            }

            fileStream.classList.toggle('active', !options.hideFile);
            streamPicture.classList.remove('active', 'success', 'fail');

            if (picture) {
                streamPicture.src = picture;
                videoActive = false;
                takePicture.textContent = btnInactiveTitle;
                takePicture.dataset.i18n = btnInactiveTitle;
                streamVideo.classList.remove('active');
                streamPicture.classList.add('active');
            }

            if (autoCapture && videoActive) {
                prepareVideo.timer = setInterval(takePhoto, mode.timerAutoCapture, true);
            }
        };

        function result() {
            var result;
            if (typeof options.callback === 'function') {
                result = options.callback(streamPicture.src);
            }
            return Promise.resolve(result).then((isOk) => {
                streamPicture.classList.remove('success', 'fail');
                if (isOk === true) {
                    streamPicture.classList.add('success');
                } else
                if (isOk === false) {
                    streamPicture.classList.add('fail');
                }

                return isOk;
            });
        }

        function showPicture() {
            takePicture.textContent = btnInactiveTitle;
            takePicture.dataset.i18n = btnInactiveTitle;
            streamVideo.classList.remove('active');
            streamPicture.classList.add('active');
        }

        function takePhoto(autoTake) {
            if (takePhoto.wait) {
                if (autoTake !== true) {
                    takePhoto.waiting = arguments;
                    checkPhotoAvailability();
                }
                return;
            }
            if (videoActive) {
                takePhoto.wait = true;

                if (autoTake !== true) {
                    videoActive = false;
                }
                const vWidth = streamVideo.videoWidth;
                const vHeight = streamVideo.videoHeight;
                let width = canvasSize, height = canvasSize;
                let offsetX = 0;
                let offsetY = 0;
                if (fullVideo) {
                    if (vWidth > vHeight) {
                        height = canvasSize * vHeight / vWidth;
                        offsetY = (canvasSize - height) / 2;
                    } else {
                        width = canvasSize * vWidth / vHeight;
                        offsetX = (canvasSize - width) / 2;
                    }
                } else {
                    if (vWidth > vHeight) {
                        width = canvasSize * vWidth / vHeight;
                        offsetX = (canvasSize - width) / 2;
                    } else {
                        height = canvasSize * vHeight / vWidth;
                        offsetY = (canvasSize - height) / 2;
                    }
                }
                streamCanvas.getContext('2d').drawImage(streamVideo, 0, 0, vWidth, vHeight, offsetX, offsetY, width, height);
                let data = streamCanvas.toDataURL('image/png');
                streamPicture.src = data;

                if (autoTake !== true) {
                    showPicture();
                    result().then(() => {
                        takePhoto.wait = false;
                        checkPhotoAvailability();
                    });
                } else {
                    result().then((isOk) => {
                        if (isOk) {
                            videoActive = false;
                            showPicture();
                        }
                        takePhoto.wait = false;
                        checkPhotoAvailability();
                    });
                }
            } else {
                if (autoTake === true) {
                    return;
                }
                videoActive = true;
                streamVideo.classList.add('active');
                streamPicture.classList.remove('active');
                takePicture.textContent = btnActiveTitle;
                takePicture.dataset.i18n = btnActiveTitle;
            }
        };
        takePhoto.waiting = null;

        function checkPhotoAvailability() {
            clearTimeout(checkPhotoAvailability.timer);
            if (takePhoto.wait) {
                checkPhotoAvailability.timer = setTimeout(checkPhotoAvailability, 100);
            } else
            if (takePhoto.waiting) {
                let args = takePhoto.waiting;
                takePhoto.waiting = null;
                takePhoto(...args);
            }
        }

        takePicture.onclick = takePhoto;
        streamVideo.onclick = takePhoto;
        streamPicture.onclick = takePhoto;

        fileStream.querySelector('input').onchange = function(evt) {
            let reader = new FileReader();
            reader.onloadend = function(data) {
                streamPicture.src = data.target.result;
                streamVideo.classList.remove('active');
                streamPicture.classList.add('active');
                videoActive = false;
                takePicture.textContent = btnFromCameraTitle;
                takePicture.dataset.i18n = btnFromCameraTitle;
                result();
            };
            reader.readAsDataURL(evt.target.files[0]);
        };

        initializeVideo();
    }
    prepareVideo.timer = -1;
    prepareVideo.mediaStream = [];
    prepareVideo.stopVideo = function() {
        prepareVideo.mediaStream.forEach(mediaStreamTrack => mediaStreamTrack.stop());
        prepareVideo.mediaStream = [];
        clearInterval(prepareVideo.timer);
    };

    function scanCode(img, callback) {
        Quagga.decodeSingle({
            decoder: {
                readers: ["ean_reader"] // List of active readers
            },
            locate: true, // try to locate the barcode in the image
            src: img // or 'data:image/jpg;base64,' + data
        }, callback);
    }

    const stepActions = {
        '1': {
            el: null,
            div: document.querySelector('.step-code'),
            title: 'Enter the Goblean\'s EAN code',
            action: function() {
                views.createGoblean.classList.toggle('camera-on', supportMediaDevice);
                mainEls.gobleanCreationCode.oninput = () => {
                    this.result = mainEls.gobleanCreationCode.value;
                    this.fromCamera = false;
                };
                mainEls.gobleanCreationCode.value = _.parse('%§', this.result);
                mainEls.gobleanCreationCode.disabled = this.readOnly;
                mainEls.gobleanCreationSideContent.innerHTML = '';
                if (!this.readOnly) {
                    if (!this.el) {
                        this.el = mainEls.videoSection.cloneNode(true);
                        this.el.id = 'step1';
                        this.el.classList.add('video-stream');
                        prepareVideo({
                            el: this.el,
                            hideFile: true,
                            fullVideo: false,
                            canvasSize: 1000,
                            autoCapture: true,
                            btnActiveTitle: _('Scan picture'),
                            btnInactiveTitle: _('Scan again'),
                            callback: (src) => {
                                return new Promise((success) => {
                                    scanCode(src, (result) => {
                                        if (result && result.codeResult) {
                                            mainEls.gobleanCreationCode.value = result.codeResult.code;
                                            this.result = result.codeResult.code;
                                            this.fromCamera = true;
                                            success(true);
                                        } else {
                                            success(false);
                                        }
                                    });
                                });
                            }
                        });
                    }
                    mainEls.gobleanCreationSideContent.appendChild(this.el);

                    if (!supportMediaDevice) {
                        setTimeout(() => {
                            mainEls.gobleanCreationCode.focus();
                        }, 10);
                    }
                } else {
                    mainEls.createGobleanMessage.classList.add('active-info');
                    mainEls.createGobleanMessage.textContent = _('Code of a Goblean cannot be changed. Create another one if the code is wrong.');
                }
            },
            readOnly: false,
            result: '',
            fromCamera: false
        },
        '2': {
            el: null,
            div: document.querySelector('.step-picture'),
            title: 'Add a picture of your Goblean',
            action: function() {
                views.createGoblean.classList.toggle('camera-on', supportMediaDevice);
                mainEls.gobleanCreationSideContent.innerHTML = '';
                if (!this.el) {
                    this.el = mainEls.videoSection.cloneNode(true);
                    this.el.id = 'step2';
                    this.el.classList.add('video-stream');
                    prepareVideo({
                        el: this.el,
                        hideFile: false,
                        callback: (src) => {
                            this.result = src;
                            return true;
                        },
                        picture: this.result
                    });
                }
                mainEls.gobleanCreationSideContent.appendChild(this.el);
            },
            result: null
        },
        '3': {
            div: document.querySelector('.step-name'),
            title: 'Give a name to the Goblean',
            action: function() {
                views.createGoblean.classList.remove('camera-on');
                prepareVideo.stopVideo();
                mainEls.gobleanCreationSideContent.innerHTML = '';
                mainEls.gobleanCreationName.oninput = () => {
                    this.result = mainEls.gobleanCreationName.value;
                };
                mainEls.gobleanCreationName.value = this.result;
                setTimeout(() => {
                    mainEls.gobleanCreationName.focus();
                }, 10);
            },
            result: ''
        }
    };

    function gotoStep(nb = '1') {
        initializeGobleanCreation.step = +nb;
        views.createGoblean.querySelector('.step-breadcrumb.active').classList.remove('active');
        views.createGoblean.querySelector('.step-breadcrumb.step-' + nb).classList.add('active');

        mainEls.createGobleanSection.querySelector('.content > .active').classList.remove('active');
        mainEls.createGobleanTitle.textContent = _(stepActions[nb].title);
        mainEls.createGobleanMessage.classList.remove('active', 'active-info');
        stepActions[nb].action();
        stepActions[nb].div.classList.add('active');
    }

    function initializeGobleanCreation(options = {}) {
        function removeElement(step) {
            if (step.el) {
                step.el.parentNode && step.el.parentNode.removeChild(step.el);
                step.el = null;
            }
        }

        removeElement(stepActions['1']);
        stepActions['1'].result = options.code || '';
        stepActions['1'].readOnly = !!options.code;
        stepActions['1'].fromCamera = !!options.fromCamera;
        removeElement(stepActions['2']);
        stepActions['2'].result = options.picture || null;
        stepActions['3'].result = options.name || '';
        mainEls.gobleanCreationCode.value = '';
        mainEls.gobleanCreationName.value = '';

        gotoStep(1);
        setView('createGoblean', true, true);
    }

    function validateGobleanCreation() {
        if (initializeGobleanCreation.step < 3) {
            gotoStep(initializeGobleanCreation.step + 1);
            return;
        }

        const name = stepActions['3'].result;
        const picture = stepActions['2'].result;
        const code = stepActions['1'].result;
        const fromCamera = stepActions['1'].fromCamera;
        if (!name) {
            gotoStep(3);
            mainEls.createGobleanMessage.classList.add('active');
            mainEls.createGobleanMessage.textContent = _('Please add a name');
            return;
        }
        const goblean = new Fighter(0, {
            name, picture, code, fromCamera
        });
        if (goblean.isValid()) {
            goblean.save();
            if (typeof initializeGobleanCreation.callback === 'function') {
                initializeGobleanCreation.callback(goblean);
                initializeGobleanCreation.callback = null;
            }
            setView('', true, false);
        } else {
            gotoStep(1);
            mainEls.createGobleanMessage.classList.add('active');
            mainEls.createGobleanMessage.textContent = _('Please enter an EAN code');
        }
    }

    function initializeConfiguration() {
        mainEls.modeAuto.checked = mode.autoFight;
        document.getElementById('mode-auto-creation').checked = mode.autoCreationSelect;
        document.getElementById('fight-configuration').value = mode.fightMode;

        setView('configuration', true, true);
    }

    function changeModeAuto() {
        mode.autoFight = this.checked;
        let message = mode.autoFight ? 'The tactical choices will be chosen automatically' : 'Players have to choose the tactical choices';
        setMessage(message, false, true);
        localStorage.setItem('mode', JSON.stringify(mode));
    }

    function localeChanged() {
        mainEls.locale.src = 'img/locale-' + _.getLocale() + '.png';
        _.html();
        document.querySelectorAll('.fighter-picture,.goblean-picture').forEach(el => el.title = el.alt = _('picture of your Goblean'));
        document.querySelector('.credit-authors').textContent =
            _('Thanks to %L for all they did to the Goblean game and the time they spent on it.', authors);
    }

    function chooseLocale() {
        if (mainEls.localeChooser.classList.contains('active')) {
            mainEls.localeChooser.classList.remove('active');
        } else {
            mainEls.localeChooser.classList.add('active');
        }
    }

    function changeLocale(evt) {
        let locale = evt.target.dataset.locale;
        mainEls.localeChooser.classList.remove('active');
        _.setLocale(locale);
    }

    function prepareEvents() {
        mainEls.readyBtn.onclick = startFight;

        // mainEls.creationName.oninput = function() {
        //     var isValid = currentFighter.setAttributes({
        //         name: this.value
        //     });
        //     mainEls.creationBtnForm.disabled = !isValid;
        // };
        // mainEls.creationCode.oninput = function() {
        //     var isValid = currentFighter.setAttributes({
        //         code: this.value
        //     });
        //     mainEls.creationBtnForm.disabled = !isValid;
        // };

        // mainEls.creationBtnForm.onclick = addToBattle;
        // mainEls.gobleanBtnForm.onclick = addToBattle;

        mainEls.choice1.onclick = attackChoice.bind(null, 0);
        mainEls.choice2.onclick = attackChoice.bind(null, 1);
        mainEls.choice3.onclick = attackChoice.bind(null, 2);
        mainEls.choice4.onclick = attackChoice.bind(null, 3);

        document.querySelector('.gobleaena').onclick = initializeBattle;
        document.querySelector('.goblean-stats').onclick = initializeStats;
        document.querySelector('.rules').onclick = setView.bind(null, 'rules', true, true);
        document.querySelector('.credits').onclick = setView.bind(null, 'credits', true, true);
        document.querySelector('.configuration').onclick = initializeConfiguration;
        document.querySelectorAll('.back-home').forEach(el => el.onclick = function() {
            prepareVideo.stopVideo();
            setView('', true, false);
        });
        document.querySelector('.validate-create-goblean').onclick = validateGobleanCreation;

        document.querySelector('.breadcrumb').onclick = function (evt) {
            const clList = evt.target.classList;
            const nb = clList.contains('step-3') ? 3 : clList.contains('step-2') ? 2 : 1;
            gotoStep(nb);
        };

        mainEls.modeAuto.onchange = changeModeAuto;

        document.querySelector('.show-historic').onclick = function() {
            if (mainEls.lastLogs.classList.contains('active')) {
                mainEls.lastLogs.classList.remove('active');
            } else {
                mainEls.lastLogs.classList.add('active');
            }
        };

        mainEls.warningDeletion.querySelector('.btn-cancel').onclick = () => {
            mainEls.warningDeletion.close();
        };

        document.onkeydown = function(evt) {
            switch (viewStack[viewStack.length -1]) {
                case 'createGoblean':
                    switch (evt.keyCode) {
                        case 13: validateGobleanCreation(); break;
                        case 27: setView('', true, false); break;
                    }
                    break;
                case 'stats':
                    switch (evt.keyCode) {
                        case 13:
                            if (mainEls.warningDeletion.open) {
                                mainEls.warningDeletion.querySelector('.btn-delete').click();
                                evt.preventDefault();
                            }
                            break;
                        case 27:
                            if (mainEls.warningDeletion.open) {
                                mainEls.warningDeletion.close();
                            } else {
                                setView('', true, false);
                            }
                            break;
                        case 46:
                            if (mainEls.warningDeletion.open) {
                                mainEls.warningDeletion.querySelector('.btn-delete').click();
                                evt.preventDefault();
                            } else {
                                mainEls.deleteGoblean.click();
                            }
                            break;
                        default:
                            console.log(evt.keyCode)
                    }
                    break;
            }
        }

        mainEls.locale.onclick = chooseLocale;
        mainEls.localeChooser.onclick = changeLocale;
    }

    function initialize() {
        i18n.configuration({
            alias: '_',
            localeSet: [
                {
                    key: 'en',
                    name: 'English',
                    data: 'dictionary-en.json',
                    formatRules: {
                        number: {
                            thousandSeparator: ',',
                            decimalSeparator: '.'
                        }
                    }
                }, {
                    key: 'fr',
                    name: 'Français',
                    data: 'dictionary-fr.json',
                    formatRules: {
                        number: {
                            thousandSeparator: ' ',
                            decimalSeparator: ','
                        }
                    }
                }

            ],
            storage: ['localStorage', 'cookie'],
            onLocaleReady: localeChanged,
            // defaultFormat: {
            //     string: {
            //         escape: 'html'
            //     }
            // }
        });
        _.addRule('§', function(params) {
            let value = params.value;

            if (value.length > 8) {
                value = value.slice(0, 13).split('');
                value.splice(-6, 0, ' ');
                value.splice(1, 0, ' ');
            } else {
                value = value.split('');
                value.splice(-4, 0, ' ');
            }
            return value.join('');
        });
        _.addRule('L', function(params) {
            var values = params.value.slice(0, -1);
            var lastValue = params.value.slice(-1);

            return values.join(', ') + ' ' + _('and') + ' ' + lastValue;
        });

        const options = JSON.parse(localStorage.getItem('mode') || '{}');
        Object.assign(mode, options);

        let locales = _.getLocales({key: true, name: true});
        locales.forEach(l => {
            let el = document.createElement('img');
            el.src = 'img/locale-' + l.key + '.png';
            el.width = '32';
            el.height = '32';
            el.dataset.locale = l.key;
            el.title = l.name;
            mainEls.localeChooser.appendChild(el);
        });

        prepareEvents();
    }

    initialize();
})();