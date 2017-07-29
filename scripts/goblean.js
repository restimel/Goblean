(function() {
	'use strict';

	const views = {
		main: document.getElementById('main-view'),
		addFighter: document.getElementById('add-fighter'),
		battle: document.getElementById('battle'),
		rules: document.getElementById('rules'),
		credits: document.getElementById('credits'),
		stats: document.getElementById('stats'),
	};

	const mainEls = {
		creationForm: document.getElementById('fighter-creation'),
		creationSection: document.querySelector('.fighter-creation'),
		creationStat: document.querySelector('.fighter-stats'),
		creationTitle: document.getElementById('nb-fighter'),
		creationBtnForm: document.querySelector('#fighter-creation button'),
		gobleanBtnForm: document.querySelector('.fighter-stats button'),
		creationPicture: document.querySelector('#fighter-creation img'),
		creationName: document.getElementById('fighter-name'),
		creationCode: document.getElementById('fighter-code'),
		fighterSelection: document.querySelector('.fighter-selection'),
		gobleanName: document.querySelector('.goblean-name'),
		gobleanCode: document.querySelector('.goblean-code'),
		gobleanPicture: document.querySelector('.goblean-picture'),
		readyFight: document.getElementById('ready-fight'),
		messageText: document.querySelector('.text-message'),
		attackChoice: document.querySelector('.attack-choice'),
		modeOptions: document.querySelector('.mode-options'),
		modeAuto: document.getElementById('mode-auto'),
		readyBtn: document.getElementById('battle-ready'),
		endBtn: document.getElementById('battle-end'),
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
		statTitle: document.querySelector('.stat-title'),
		statNbf: document.querySelector('.stat-nbf'),
		statNbw: document.querySelector('.stat-nbw'),
		statRatio: document.querySelector('.stat-ratio'),
		localeChooser: document.querySelector('.locale-chooser'),
		locale: document.querySelector('.locale'),
	};

	const mode = {
		auto: false
	};

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

	function setView(view, animate) {
		const elViews = document.querySelectorAll('.view.active');
		let opacity = 1;

		function hide() {
			for (let elView of elViews) {
				elView.classList.remove('active');
				elView.classList.remove('old-active');
				elView.style.opacity = '';
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

	function setMessage(text, keepI18n = false) {
		mainEls.attackChoice.classList.remove('active');
		mainEls.messageText.classList.add('active');
		if (keepI18n) {
			mainEls.messageText.dataset.i18n = text;
			text = _(text);
		} else {
			mainEls.messageText.dataset.i18n = undefined;
		}
		mainEls.messageText.textContent = text;
	}

	function setChoice(list) {
		mainEls.modeOptions.classList.remove('active');

		if (!list[0]) {
			mainEls.messageText.classList.remove('active');
		} else {
			mainEls.messageText.classList.add('active');
			mainEls.messageText.textContent = list[0];
		}

		if (mode.auto) {
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

		if (addFirstItem) {
			list.unshift(addFirstItem);
		}

		if (list.length === 0) {
			list.push({name: 'no Goblean fighters yet', nbw: 0, nbf: 0, code: 0, picture: ''});
		}

		if (selected === true) {
			selected = list[0];
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

	function initializeFighter(nb) {
		let fighter = fighters[nb-1];
		currentFighter = fighter;

		let title = nb === 1 ? 'First Goblean fighter' : 'Second Goblean fighter';
		mainEls.creationTitle.textContent = _(title);
		mainEls.creationTitle.dataset.i18n = title;

		mainEls.creationBtnForm.disabled = !fighter.isValid();
		fillList(mainEls.fighterSelection, {
			addFirstItem: {name: _('+ Create a new Goblean')},
			callback: function(goblean) { return function() {
				document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
				this.classList.add('selected');

				if (!goblean.code) {
					mainEls.creationSection.classList.add('active');
					mainEls.creationStat.classList.remove('active');

					currentFighter = new Fighter(nb);

					mainEls.creationName.value = '';
					mainEls.creationCode.value = '';
					mainEls.creationPicture.src = '';
					mainEls.creationBtnForm.disabled = true;
				} else {
					mainEls.creationSection.classList.remove('active');
					mainEls.creationStat.classList.add('active');

					currentFighter = new Fighter(nb, goblean);

					mainEls.gobleanName.textContent = currentFighter.name || '';
					mainEls.gobleanCode.textContent = currentFighter.code || '';
					mainEls.gobleanPicture.src = currentFighter.picture || '';

				}

				fighters[nb-1] = currentFighter;
			};},
			selected: currentFighter
		});

		setView('addFighter', true);
	}

	function updateFighter(fighter) {
		var el = mainEls['fighter' + fighter.position];

		el.querySelector('.fighter-name').textContent = fighter.name || '?';

		if (fighter.isValid()) {
			mainEls['fighter' + fighter.position + 'Ready'].classList.add('active');
			fighter.drawPicture(el.querySelector('.fighter-picture'));

			localStorage.setItem('fighter' + fighter.position, JSON.stringify(fighter));

			if (fighters.every(f => f.isValid())) {
				mainEls.readyBtn.classList.add('active');
			}
		}

		setMessage('Awaiting for goblean fighters', true);
	}

	function addToBattle(evt) {
		evt.preventDefault();
		if (this.disabled) {
			return;
		}

		mainEls.readyFight.classList.add('active');
		animationElement(mainEls.readyFight, 1, () => {
			setTimeout(() => {
				mainEls.readyFight.classList.remove('active');
				updateFighter(currentFighter);
				setView('battle', true);
			}, 1000);
		});
	}

	function initializeBattle() {
		fighters[0] = new Fighter(1, localStorage.getItem('fighter1'));
		fighters[1] = new Fighter(2, localStorage.getItem('fighter2'));

		mainEls.fighter1.className = 'fighter fighter1';
		mainEls.fighter2.className = 'fighter fighter2';
		mainEls.endBtn.classList.remove('active');
		views.battle.classList.add('preparation');

		mainEls.modeOptions.classList.add('active');
		mainEls.modeAuto.checked = mode.auto;

		fighters.forEach(updateFighter);

		setView('battle', true);
		mainEls.fighter1.onclick = initializeFighter.bind(null, 1);
		mainEls.fighter2.onclick = initializeFighter.bind(null, 2);
		setMessage('Awaiting for goblean fighters', true);
	}

	function startFight() {
		mainEls.fighter1.onclick = null;
		mainEls.fighter2.onclick = null;
		views.battle.classList.remove('preparation');
		mainEls.readyBtn.classList.remove('active');
		mainEls.fighter1Ready.classList.remove('active');
		mainEls.fighter2Ready.classList.remove('active');

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
			let otherFighter = fighters[currentFighter.position % 2];
			let attack = currentFighter.chooseAttack(choice);
			let dmg = otherFighter.setDamage(attack);
			mainEls.attackResult.textContent = -dmg;
			mainEls.attackResult.classList.add('active' + otherFighter.position);
			setMessage(_('%(name)s has lost %(dmg)i hp', {
				name: otherFighter.name,
				dmg: dmg
			}));
			setTimeout(finishAttack, 500);
		});
	}

	function setWinner() {
		let otherFighter = fighters[currentFighter.position % 2];
		mainEls['fighter' + currentFighter.position].classList.add('loser');
		mainEls['fighter' + otherFighter.position].classList.add('winner');
		otherFighter.numberOfWin++;

		save();

		let messages = ['The champion is %(name)s', '%(name)s kicks off %(nameLoser)s', 'The victory is for %(name)s'];
		let message = messages[Math.floor(Math.random() * messages.length)];

		setMessage(_(message, {
			name: otherFighter.name,
			nameLoser: currentFighter.name
		}));

		mainEls.endBtn.classList.add('active');
		return;
	}

	function initializeStats() {
		setView('stats', true);

		fillList(mainEls.gobleanList, {
			callback: function(goblean) {
				return function() {
					document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
					this.classList.add('selected');

					let ratio = goblean.nbw / goblean.nbf;
					ratio = Math.round(ratio * 10000) / 100;

					mainEls.statTitle.textContent = goblean.name;
					mainEls.statNbf.textContent = goblean.nbf;
					mainEls.statNbw.textContent = goblean.nbw;
					mainEls.statRatio.textContent = ratio + '%';
				};
			},
			selected: true
		});
	}

	function changeModeAuto() {
		mode.auto = this.checked;
		let message = mode.auto ? 'The tactical choices will be chosen automatically' : 'Players have to choose the tactical choices';
		setMessage(message, true);
		localStorage.setItem('mode', JSON.stringify(mode));
	}

	function localeChanged() {
		mainEls.locale.src = 'img/locale-' + _.getLocale() + '.png';
		_.html();
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

		mainEls.creationName.oninput = function() {
			var isValid = currentFighter.setAttributes({
				name: this.value
			});
			mainEls.creationBtnForm.disabled = !isValid;
		};
		mainEls.creationCode.oninput = function() {
			var isValid = currentFighter.setAttributes({
				code: this.value
			});
			mainEls.creationBtnForm.disabled = !isValid;
		};

		mainEls.creationBtnForm.onclick = addToBattle;
		mainEls.gobleanBtnForm.onclick = addToBattle;

		mainEls.choice1.onclick = attackChoice.bind(null, 0);
		mainEls.choice2.onclick = attackChoice.bind(null, 1);
		mainEls.choice3.onclick = attackChoice.bind(null, 2);
		mainEls.choice4.onclick = attackChoice.bind(null, 3);

		document.querySelector('.gobleaena').onclick = initializeBattle;
		document.querySelector('.goblean-stats').onclick = initializeStats;
		document.querySelector('.rules').onclick = setView.bind(null, 'rules', true);
		document.querySelector('.credits').onclick = setView.bind(null, 'credits', true);
		document.querySelectorAll('.back-home').forEach(el => el.onclick = setView.bind(null, 'main', true));

		mainEls.modeAuto.onchange = changeModeAuto;

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
			onLocaleReady: localeChanged
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