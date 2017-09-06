const minLength = 6;

class Fighter {
	constructor(position, json) {
		this.stats = {};
		this.position = position;
		this.dmg = 0;
		this.order = 0;
		this.numberOfFight = 0;
		this.numberOfWin = 0;

		if (json) {
			if (typeof json === 'string') {
				json = JSON.parse(json);
			}
			this.setAttributes(json);
		}
	}

	toJSON() {
		return {
			name: this.name,
			code: this.code,
			picture: this.picture,
			nbf: this.numberOfFight,
			nbw: this.numberOfWin
		};
	}

	save() {
		let list = JSON.parse(localStorage.getItem('fighters') || '[]');
		let idx = list.findIndex(f => f.code === this.code);

		if (idx === -1) {
			list.push(this);
		} else {
			list[idx] = this;
		}

		localStorage.setItem('fighters', JSON.stringify(list));
	}

	remove() {
		let list = JSON.parse(localStorage.getItem('fighters') || '[]');
		let idx = list.findIndex(f => f.code === this.code);

		if (idx === -1) {
			return;
		} else {
			list.splice(idx, 1);
		}

		localStorage.setItem('fighters', JSON.stringify(list));
	}

	isValid() {
		if (!this.code || this.code.length < minLength) {
			this._error = 'code:invalid';
			return false;
		}

		if (['initiative', 'kind', 'hp', 'head', 'body', 'rightArm', 'rightLeg', 'leftArm', 'leftLeg', 'seed']
			.some(a => typeof this.stats[a] !== 'number'))
		{
			this._error = 'stats:notNumber';
			return false;
		}

		this._error = '';
		return true;
	}

	isKo() {
		return this.dmg >= this.stats.hp;
	}

	checkKey() {
		let code = this.code.split('').map(v => +v);
		let key = code.slice(-1)[0];
		let offset = code.length % 2;
		let cKey = (10 - (code.slice(0, -1).reduce((sum, val, k) => {
			let m = (k + offset) % 2 ? 1 : 3;
			return sum + m * val; 
		}, 0) % 10)) % 10;
		return key === cKey;
	}

	setCode(code) {
		let malus = 0;

		code = code.replace(/[^\d]+/, '');
		let value = code.split('').map(v => +v);
		if (value.length < minLength) {
			this.code = '';
			return false;
		}
		this.code = code;
		if (value.length === 8) {
			value.unshift(0);
			[7, 6, 5, 4].forEach((i) => {
				value.splice(i, 0, value[i]);
			});
		} else
		if (value.length < 13) {
			malus = 13 - value.length;
			[0, 5, 1, 2, 3, 5, 10].slice(0, 13 - value.length).forEach((i) => {
				value.splice(i, 0, 0);
			});
		} else
		if (value.length > 13) {
			malus = value.length - 13;
		}

		this.stats = {
			initiative: value[0] + value[3],
			kind: (value[1] + value[5]) % 3, // nb of kind
			hp: (value[12] + value[4]) * 1.5,
			head: value[11],
			body: value[10],
			rightArm: value[9],
			leftArm: value[8],
			rightLeg: value[7],
			leftLeg: value[6],
			seed: value[2]
		};

		if (this.stats.hp <= 0) {
			this.stats.hp = 30;
		}

		if (this.checkKey()) {
			this.stats.hp += 2;
			this.stats.initiative += 20;

			if (this.stats.head + this.stats.body === 0) {
				this.stats.head = 10;
				this.stats.body = 3;
			}
			if (this.stats.body + this.stats.leftArm + this.stats.leftLeg + this.stats.rightLeg + this.stats.rightArm <= 2) {
				this.stats.body += 10;
				this.stats.hp += 5;
			}
		} else {
			malus += 2;
		}

		if (malus) {
			malus = malus > 7 ? 7 : malus;
			['hp', 'hp', 'initiative', 'body', 'hp', 'head', 'initiative'].slice(0, malus).forEach((carac) => {
				this.stats[carac] = Math.max(1, this.stats[carac] - 1);
			});
		}

		this.stats.currentHp = this.stats.hp;

		return true;
	}

	setAttributes(attributes = {}) {
		if (attributes.name) {
			this.name = attributes.name;
		}

		if (attributes.picture) {
			this.picture = attributes.picture;
		}

		if (attributes.code) {
			this.setCode(attributes.code);
		}

		if (attributes.nbf) {
			this.numberOfFight = attributes.nbf;
		}

		if (attributes.nbw) {
			this.numberOfWin = attributes.nbw;
		}

		return this.isValid();
	}

	drawPicture(canvas = this.canvas) {
		if (!canvas) {
			return;
		}

		if (!this.canvas !== canvas || !this.ctx) {
			this.canvas = canvas;
			this.ctx = canvas.getContext('2d');
		}
		this.ctx.clearRect(0, 0, 200, 200);

		let setWidth = (part) => {
			var value = this.stats[part];

			value *= 2;
			if (value === 0) {
				value = 1;
			}
			this.ctx.lineWidth = value;
			return value;
		};

		let setScale = (part) => {
			var value = this.stats[part] / 10;

			if (value < 0) {
				value = 0;
			}

			this.ctx.scale(value, value);
		};

		this.ctx.save();

		let drawBody = (clip=false) => {
			this.ctx.beginPath();
			this.ctx.strokeStyle = '#000000';
			this.ctx.fillStyle = '#000000';
			let w = setWidth('body');
			if (!clip) {
				w = 0;
			}
			this.ctx.ellipse(100, 100, 20+w/2, 55+w/2, 0, 0, 2*Math.PI);
		}

		if (this.picture) {
			let h = 50 + this.stats.body;
			let img = new Image();
			img.src = this.picture;
			img.onload = () => {
				this.ctx.save();
				drawBody(true);
				this.ctx.clip();
				this.ctx.drawImage(img, 100-h, 100-h, 2*h, 2*h);
				this.ctx.restore();
			}
		} else {
			drawBody();
			this.ctx.stroke();
			this.ctx.fill();
		}

		this.ctx.beginPath();
		this.ctx.ellipse(100, 30, 19, 19, 0, 0, 2*Math.PI);
		setWidth('head');
		this.ctx.fill();
		this.ctx.stroke();

		this.ctx.beginPath();
		this.ctx.moveTo(100, 100);
		this.ctx.lineTo(170, 30);
		setWidth('leftArm');
		this.ctx.stroke();

		this.ctx.beginPath();
		this.ctx.moveTo(100, 100);
		this.ctx.lineTo(30, 30);
		setWidth('rightArm');
		this.ctx.stroke();

		this.ctx.beginPath();
		this.ctx.moveTo(100, 100);
		this.ctx.lineTo(130, 190);
		setWidth('leftLeg');
		this.ctx.stroke();

		this.ctx.beginPath();
		this.ctx.moveTo(100, 100);
		this.ctx.lineTo(70, 190);
		setWidth('rightLeg');
		this.ctx.stroke();

		// hp
		this.ctx.beginPath();
		this.ctx.save();
		this.ctx.strokeStyle = '#FF0000';
		this.ctx.fillStyle = '#FF0000';
		this.ctx.translate(50, 150);
		setScale('currentHp');
		this.ctx.ellipse(10, -5, 10, 10, 0, 0, Math.PI, true);
		this.ctx.ellipse(-10, -5, 10, 10, 0, 0, Math.PI, true);
		this.ctx.lineTo(0, 15);
		this.ctx.closePath();
		this.ctx.fill();
		this.ctx.restore();

		this.ctx.restore();
	}

	createOneChoice() {
		let attack = this.choiceAttack[this.order % this.choiceAttack.length];
		let support = this.choiceSupport[this.order % this.choiceSupport.length];
		let target = this.target[this.order % this.target.length];

		this.order++;
		return [attack, support, target];
	}

	createNextChoice() {
		this.choice = [
			this.createOneChoice(),
			this.createOneChoice(),
			this.createOneChoice(),
			this.createOneChoice()
		];
	}

	getChoice() {
		if (!this.choice) {
			this.createNextChoice();
		}

		return this.choice.map(choice => _('%(attack)s + %(support)s vs %(defense)s', {
			attack: _(choice[0]),
			support: _(choice[1]),
			defense: _(choice[2])
		}));
	}

	chooseAttack(idx) {
		const choice = this.choice[idx];
		this.createNextChoice();
		return [this.stats[choice[0]] + this.stats[choice[1]] / 2, choice[2]];
	}

	setDamage(attack) {
		const defense = this.stats[attack[1]];
		let dmg = Math.floor(attack[0] - defense);

		if (dmg < 1) {
			dmg = 1;
		}

		this.dmg += dmg;
		this.stats.currentHp -= dmg; 

		this.drawPicture();

		return dmg;
	}
}

Fighter.prototype.choiceAttack = ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
Fighter.prototype.choiceSupport = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
Fighter.prototype.target = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
