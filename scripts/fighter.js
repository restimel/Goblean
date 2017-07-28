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
		console.debug('TODO save json in localstorage')
		let list = JSON.parse(localStorage.getItem('fighters') || '[]');
		let idx = list.findIndex(f => f.code === this.code);

		if (idx === -1) {
			list.push(this);
		} else {
			list[idx] = this;
		}

		localStorage.setItem('fighters', JSON.stringify(list));
	}

	isValid() {
		if (!this.code || this.code.length < 13) {
			return false;
		}

		if (['initiative', 'kind', 'hp', 'head', 'body', 'rightArm', 'rightLeg', 'leftArm', 'leftLeg', 'seed']
			.some(a => typeof this.stats[a] !== 'number'))
		{
			return false;
		}

		return true;
	}

	isKo() {
		return this.dmg >= this.stats.hp;
	}

	setCode(code) {
		if (code.length < 13) {
			this.code = '';
			return false;
		}

		let value = code.split('').map(v => +v);
		this.code = code;

		this.stats = {
			initiative: value[0],
			kind: (value[1] + value[5]) % 2, // nb of kind
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

		if (!this.canvas || !this.ctx) {
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
		};

		let setScale = (part) => {
			var value = this.stats[part] / 10;
			
			if (value < 0) {
				value = 0;
			}

			this.ctx.scale(value, value);
		};

		this.ctx.beginPath();
		this.ctx.strokeStyle = '#000000';
		this.ctx.fillStyle = '#000000';
		this.ctx.ellipse(100, 100, 20, 50, 0, 0, 2*Math.PI);
		setWidth('body');
		this.ctx.stroke();
		this.ctx.fill();

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

		return this.choice.map(choice => `${choice[0]} + ${choice[1]} vs ${choice[2]}`);
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
