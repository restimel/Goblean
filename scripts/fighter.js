const minLength = 6;
const energyThreshold = 20;


class Fighter {
	constructor(position, json) {
		this.mode = 'rest';

		this.stats = {};
		this.position = position;
		this.dmg = 0;
		this.order = 0;
		this.numberOfFight = 0;
		this.numberOfWin = 0;

		this.choice = [null, null, null, null];

		if (json) {
			if (json.isGhost) {
				this.isGhost = true;
				this.autoFight = 1;
			}
			if (typeof json === 'string') {
				json = JSON.parse(json);
			}
			this.setAttributes(json);
		}
		this.resetEnergy();
		this.initializeAttack();
	}

	toJSON() {
		return {
			name: this.name,
			code: this.code,
			fromCamera: this.fromCamera,
			picture: this.picture,
			nbf: this.numberOfFight,
			nbw: this.numberOfWin,
			isGhost: this.isGhost
		};
	}

	save() {
		if (this.isGhost) {
			return;
		}

		let list = JSON.parse(localStorage.getItem('fighters') || '[]');
		let idx = list.findIndex(f => f.code === this.code);

		if (idx === -1) {
			list.push(this);
			if (this.fromCamera) {
				this.gameStatistics.nbGoblean++;
				localStorage.setItem('gameStatistics', JSON.stringify(this.gameStatistics));
			}
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
		if (this.isGhost) {
			return !this._error;
		}

		if (!this.code || this.code.length < minLength) {
			this._error = 'code:invalid';
			return false;
		}

		if (['initiative', 'kind', 'hp', 'head', 'body', 'rightArm', 'rightLeg', 'leftArm', 'leftLeg', 'energyRestore', 'armor']
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

	getGhost() {
		let [hasGhost, ghost, code] = Fighter.isThereGhost();

		if (!hasGhost) {
			this.name = '';
			this._error = _('No ghost right now! Try again later.');
			return false;
		}

		this._error = '';

		this.ghostId = ghost.id;
		this.name = _('Ghost');
		ghost.modifyStats && (this.modifyStats = ghost.modifyStats);
		ghost.modifyDamage && (this.modifyDamage = ghost.modifyDamage);
		ghost.drawAlternative && (this.drawAlternative = ghost.drawAlternative);
		ghost.skipAttack && (this.skipAttack = ghost.skipAttack);

		return code;
	}

	setCode(code) {
		if (this.isGhost) {
			code = this.getGhost();
			if (!code) {
				return false;
			}
		}

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
			energyRestore: value[2],
			armor: 0
		};

		/* bonus */

		if (this.fromCamera) {
			this.stats.energyRestore += 0.5;
		} else
		if (this.isGhost) {
			this.stats.energyRestore += 1.5;
		}

		if (this.stats.hp <= 0) {
			this.stats.hp = 30;
		}

		if (this.isGhost || this.checkKey()) {
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

		/* malus */

		if (malus && !this.isGhost) {
			malus = malus > 7 ? 7 : malus;
			['hp', 'hp', 'initiative', 'body', 'hp', 'head', 'initiative'].slice(0, malus).forEach((carac) => {
				this.stats[carac] = Math.max(1, this.stats[carac] - 1);
			});
		}

		this.modifyStats();

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

		if (typeof attributes.nbf !== 'undefined') {
			this.numberOfFight = attributes.nbf;
		}

		if (typeof attributes.nbw !== 'undefined') {
			this.numberOfWin = attributes.nbw;
		}

		if (typeof attributes.fromCamera === 'boolean') {
			this.fromCamera = attributes.fromCamera;
		}

		return this.isValid();
	}

	resetEnergy() {
		this.stats.energy = 0;
	}

	setMode(mode = 'rest') {
		this.mode = mode;
		if (this.canvas) {
			this.drawPicture();
		}
	}

	setScale(part) {
		let value = this.stats[part] / 10;

		if (value < 0) {
			value = 0;
		}

		this.ctx.scale(value, value);
		return value;
	}

	setWidth(part) {
		let value = this.stats[part];

		value *= 2;
		if (value === 0) {
			value = 1;
		}
		this.ctx.lineWidth = value;
		return value;
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

		if (this.isGhost && !this.name) {
			//no ghost
			this.ctx.save();
			this.ctx.beginPath();
			this.ctx.ellipse(100, 100, 30, 30, 0, 0, 2*Math.PI);
			this.ctx.fill();
			this.ctx.restore();
			return;
		}

		this.ctx.save();

		this.ctx.strokeStyle = this.baseColor;
		this.ctx.fillStyle = this.baseColor;

		if (this.drawAlternative()) {
			this.ctx.restore();
			return;
		}

		if (this.picture) {
			let h = 50 + this.stats.body;
			let img = new Image();
			img.src = this.picture;
			img.onload = () => {
				this.ctx.save();
				this.drawBody(true);
				this.ctx.drawImage(img, 100-h, 100-h, 2*h, 2*h);
				this.ctx.restore();
			}
		} else {
			this.drawBody();
		}

		this.drawHead();
		this.drawArms();
		this.drawLegs();
		this.drawHP();
		this.drawEyes();
		this.drawEnergy();

		this.ctx.restore();
	}

	drawGhostBody() {
		this.ctx.beginPath();
		let w = this.setWidth('body')/2;
		this.ctx.moveTo(60-w, 145+w);
		this.ctx.bezierCurveTo(60-w, 15-w, 140+w, 15-w, 140+w,140+w);
		this.ctx.lineTo(130, 135-w);
		this.ctx.lineTo(115, 145+w);
		this.ctx.lineTo(100, 135-w);
		this.ctx.lineTo(85, 145+w);
		this.ctx.lineTo(70, 135-w);
		this.ctx.lineTo(60-w, 145+w);
		this.ctx.stroke();
		this.ctx.fill();
	}

	drawBody(clip=false) {
		this.ctx.beginPath();
		let w = this.setWidth('body');
		if (!clip) {
			w = 0;
		}
		this.ctx.ellipse(100, 100, 20+w/2, 55+w/2, 0, 0, 2*Math.PI);
		
		if (clip) {
			this.ctx.clip();
		} else {
			this.ctx.stroke();
			this.ctx.fill();
		}
	}

	drawHead() {
		this.ctx.beginPath();
		this.ctx.ellipse(100, 30, 19, 19, 0, 0, 2*Math.PI);
		this.setWidth('head');
		this.ctx.fill();
		this.ctx.stroke();
	}

	drawArms() {
		this.ctx.beginPath();
		this.ctx.moveTo(100, 100);
		this.ctx.lineTo(170, 30);
		this.setWidth('leftArm');
		this.ctx.stroke();

		this.ctx.beginPath();
		this.ctx.moveTo(100, 100);
		this.ctx.lineTo(30, 30);
		this.setWidth('rightArm');
		this.ctx.stroke();
	}

	drawLegs() {
		this.ctx.beginPath();
		this.ctx.moveTo(100, 100);
		this.ctx.lineTo(130, 190);
		this.setWidth('leftLeg');
		this.ctx.stroke();

		this.ctx.beginPath();
		this.ctx.moveTo(100, 100);
		this.ctx.lineTo(70, 190);
		this.setWidth('rightLeg');
		this.ctx.stroke();
	}

	drawHP() {
		this.ctx.beginPath();
		this.ctx.save();
		this.ctx.strokeStyle = '#FF0000';
		this.ctx.fillStyle = '#FF0000';
		this.ctx.translate(50, 150);
		this.setScale('currentHp');
		this.ctx.ellipse(10, -5, 10, 10, 0, 0, Math.PI, true);
		this.ctx.ellipse(-10, -5, 10, 10, 0, 0, Math.PI, true);
		this.ctx.lineTo(0, 15);
		this.ctx.closePath();
		this.ctx.fill();
		this.ctx.restore();
	}

	drawEyes() {
		if (this.fromCamera || this.isGhost) {
			this.ctx.beginPath();
			this.ctx.save();
			this.ctx.strokeStyle = this.baseColor;
			this.ctx.fillStyle = this.isGhost ? '#FF0000' : '#00FF00';
			this.ctx.ellipse(107, 25, 2, 2, 0, 0, 2*Math.PI);
			this.ctx.ellipse(93, 25, 2, 2, 0, 0, 2*Math.PI);
			// this.ctx.stroke();
			this.ctx.fill();
			this.ctx.restore();
		}
	}

	drawEnergy() {
		if (this.mode === 'battle') {
			this.ctx.beginPath();
			this.ctx.save();
			this.ctx.strokeStyle = '#00FFFF';
			this.ctx.fillStyle = '#00CCCC';

			this.ctx.lineWidth = 5;

			let x = 190;
			let y = 190;
			this.ctx.moveTo(x, y);
			this.ctx.lineTo(x-30, y);
			this.ctx.lineTo(x-30, y-80);
			this.ctx.lineTo(x-20, y-80);
			this.ctx.lineTo(x-20, y-87);
			this.ctx.lineTo(x-10, y-87);
			this.ctx.lineTo(x-10, y-80);
			this.ctx.lineTo(x, y-80);
			this.ctx.lineTo(x, y);
			this.ctx.clip();
			this.ctx.fillRect(150, 190 - (this.stats.energy * (37 / energyThreshold)), 200, 200);

			this.ctx.stroke();
			this.ctx.beginPath();
			this.ctx.lineWidth = 2.5;
			this.ctx.moveTo(x-30, y-40);
			this.ctx.lineTo(x-20, y-40);
			this.ctx.lineTo(x-20, y-47);
			this.ctx.lineTo(x-10, y-47);
			this.ctx.lineTo(x-10, y-40);
			this.ctx.lineTo(x, y-40);
			this.ctx.stroke();

			this.ctx.restore();
		}
	}

	initializeAttack(special) {
		this.listAttack = listAttack.slice();
		if (!special) {
			this.specialReady = false;
		}
	}

	createOneChoice() {
		// let attack = this.choiceAttack[this.order % this.choiceAttack.length];
		// let support = this.choiceSupport[this.order % this.choiceSupport.length];
		// let target = this.target[this.order % this.target.length];
		this.order++;

		if (this.listAttack.length === 0) {
			this.initializeAttack(true);
		}

		if (this.stats.energy > energyThreshold && !this.specialReady) {
			this.specialReady = true;
			this.listAttack.unshift({
				name: 'special attack',
				attack: ['head', 'head', 'head'],
				result: () => {
					this.stats.energy -= energyThreshold;
					this.specialReady = false;
					if (!this.isGhost && this.fromCamera) {
						this.gameStatistics.specialAttack++;
					}

					return [15, 'head'];
				}
			});
		}

		this.skipAttack();
		
		return this.listAttack.shift();
	}

	createNextChoice() {
		this.choice.forEach((c, i) => {
			if (!c) {
				this.choice[i] = this.createOneChoice();
			}
		});
	}

	/* return label of current possible attacks */
	getChoice() {
		this.createNextChoice();

		return this.choice.map(choice => _(choice.name || '%(attack)s + %(support)s vs %(defense)s', {
			attack: _(choice.attack[0]),
			support: _(choice.attack[1]),
			defense: _(choice.attack[2])
		}));
	}

	chooseAttack(idx) {
		const choice = this.choice[idx];
		this.choice[idx] = null;
		if (typeof choice.result === 'function') {
			return choice.result();
		} else {
			return [this.stats[choice.attack[0]] + this.stats[choice.attack[1]] / 2, choice.attack[2]];
		}
	}

	haveDealtDamage(dmg, opponent) {
		let energy = (4 - dmg) * this.stats.energyRestore / 2;

		this.stats.energy +=  Math.max(energy, 1);
		this.drawPicture();
	}

	setDamage(attack, opponent) {
		const defense = this.stats[attack[1]] + this.stats.armor;
		let dmg = Math.floor(attack[0] - defense);

		if (dmg < 1) {
			dmg = 1;
		}
		dmg = this.modifyDamage(attack, dmg);

		this.stats.energy += dmg * this.stats.energyRestore / 6;

		this.dmg += dmg;
		this.stats.currentHp -= dmg; 

		this.drawPicture();
		opponent.haveDealtDamage(dmg, this);

		return dmg;
	}

	modifyStats() {}

	modifyDamage(a, dmg) { return dmg; }

	drawAlternative() {}

	skipAttack() {}
}
Fighter.prototype.baseColor = '#000000';

Fighter.ghosts = [{
	id: 'white',
	modifyStats: function() {
		this.name = _('White ghost');
		this.baseColor = '#EEEEEE';
		this.stats.energyRestore += 1;
		if (this.stats.hp < 20) {
			this.stats.hp += 5;
		}
	},
	modifyDamage: function(attack, dmg) {
		dmg = Math.max(Math.round(dmg /2), 1);
		return dmg;
	},
	drawAlternative: function() {
		this.drawGhostBody();
		this.drawHead();
		this.drawArms();
		this.drawLegs();
		this.drawEyes();
		this.drawEnergy();
		return true;
	}
}, {
	id: 'blue',
	modifyStats: function() {
		this.name = _('Blue ghost');
		this.baseColor = '#1111CC';
	},
	modifyDamage: function(attack, dmg) {
		if (['head'].includes(attack[1])) {
			dmg = 0;
		}
		return dmg;
	},
	drawAlternative: function() {
		this.drawGhostBody();
		this.drawArms();
		this.drawLegs();
		this.drawHP();
		this.drawEyes();
		this.drawEnergy();
		return true;
	}
}, {
	id: 'orange',
	modifyStats: function() {
		this.name = _('Orange ghost');
		this.baseColor = '#EE9900';
	},
	skipAttack: function() {
		while (['rightArm', 'leftArm'].includes(this.listAttack[0].attack)) {
			this.listAttack.shift();
			if (this.listAttack.length === 0) {
				this.initializeAttack(true);
			}
		}
	},
	modifyDamage: function(attack, dmg) {
		if (['rightArm', 'leftArm'].includes(attack[1])) {
			dmg = 0;
		}
		return dmg;
	},
	drawAlternative: function() {
		this.drawGhostBody();
		this.drawHead();
		this.drawLegs();
		this.drawHP();
		this.drawEyes();
		this.drawEnergy();
		return true;
	}
}, {
	id: 'green',
	modifyStats: function() {
		this.name = _('Green ghost');
		this.baseColor = '#11CC11';
	},
	skipAttack: function() {
		while (['rightLeg', 'leftLeg'].includes(this.listAttack[0].attack)) {
			this.listAttack.shift();
			if (this.listAttack.length === 0) {
				this.initializeAttack(true);
			}
		}
	},
	modifyDamage: function(attack, dmg) {
		if (['rightLeg', 'leftLeg'].includes(attack[1])) {
			dmg = 0;
		}
		return dmg;
	},
	drawAlternative: function() {
		this.drawGhostBody();
		this.drawHead();
		this.drawArms();
		this.drawHP();
		this.drawEyes();
		this.drawEnergy();
		return true;
	}
}, {
	id: 'red',
	modifyStats: function() {
		this.name = _('Red ghost');
		this.baseColor = '#CC1111';
	},
	modifyDamage: function(attack, dmg) {
		return dmg;
	},
	drawAlternative: function() {
		this.drawGhostBody();
		this.drawHead();
		this.drawHP();
		this.drawEyes();
		this.drawEnergy();
		return true;
	}
}, {
	id: 'yellow',
	modifyStats: function() {
		this.name = _('Yellow ghost');
		this.baseColor = '#EEDD22';
	},
	modifyDamage: function(attack, dmg) {
		return dmg;
	},
	drawAlternative: function() {
		this.drawGhostBody();
		this.drawHead();
		this.drawArms();
		this.drawLegs();
		this.drawHP();
		this.drawEyes();
		this.drawEnergy();
		return true;
	}
}, {
	id: 'purple',
	modifyStats: function() {
		this.name = _('Purple ghost');
		this.baseColor = '#CC11CC';
		this.stats.hp = Math.max(this.stats.hp - 4, 5);
	},
	modifyDamage: function(attack, dmg) {
		if (['head', 'leftLeg', 'rightLeg', 'rightArm', 'leftLeg'].includes(attack[1])) {
			dmg = 0;
		}
		return dmg;
	},
	drawAlternative: function() {
		this.drawGhostBody();
		this.drawHP();
		this.drawEyes();
		this.drawEnergy();
		return true;
	}
}, {
	id: 'brown',
	modifyStats: function() {
		this.name = _('Brown ghost');
		this.baseColor = '#775500';
	},
	modifyDamage: function(attack, dmg) {
		if (['body'].includes(attack[1])) {
			dmg = 0;
		}
		return dmg;
	},
	drawAlternative: function() {
		this.drawHead();
		this.drawArms();
		this.drawLegs();
		this.drawHP();
		this.drawEyes();
		this.drawEnergy();
		return true;
	}
}, {
	id: 'pink',
	modifyStats: function() {
		this.name = _('Pink ghost');
		this.baseColor = '#DDBBBB';
		this.stats.hp += 10;
	},
	modifyDamage: function(attack, dmg) {
		dmg = Math.max(dmg - 1, 1);
		return dmg;
	},
	drawAlternative: function() {
		this.drawGhostBody();
		this.drawHead();
		this.drawArms();
		this.drawLegs();
		this.drawHP();
		this.drawEyes();
		this.drawEnergy();
		return true;
	}
}, {
	id: 'gray',
	modifyStats: function() {
		this.name = _('Gray ghost');
		this.baseColor = '#999999';
		this.stats.energyRestore += 0.5;
	},
	modifyDamage: function(attack, dmg) {
		return dmg;
	},
	drawAlternative: function() {
		this.drawGhostBody();
		this.drawHead();
		this.drawArms();
		this.drawLegs();
		this.drawHP();
		this.drawEyes();
		return true;
	}
}];

Fighter.isThereGhost = function() {
	const PI = Math.PI;
	const d = new Date();
	const [LAT, LNG, isActived] = geoloc();
	let timestamp = Math.round(Date.now() / 60000) + 10; // ts in min

	let hasGhost = false;
	let colorGhost;

	/* is there white ghost */
	if (d.getMinutes() < 10 && (d.getHours() === 0 || d.getHours() === 12)) {
		hasGhost = true;
		colorGhost = 0;
	}

	/* get color */
	if (!hasGhost) {
		const lat = Math.round(LAT * 1000); // ~100m
		const lng = Math.round(LNG * 100) * 2; // ~400m
		const t = lat + lng + timestamp;

		const d1 = 19;
		const s1 = 0;

		colorGhost = Math.sin(t * PI/d1) > s1 ? Math.ceil(t / (2*d1))%Fighter.ghosts.length : 0;

		// prefered color
		if (!colorGhost) {
			const d2 = 67;
			const s2 = 0.75;
			colorGhost = Math.abs(Math.round(lat + lng + Math.sin(t * PI/d2)))%Fighter.ghosts.length;
		}

		if (colorGhost < 1) {
			colorGhost = Fighter.ghosts.length - 1;
		}

		hasGhost = true;
		// ghost is not there
		if (d.getMinutes() === 4 && d.getHours() === 4  && d.getSeconds() === 0) {
			hasGhost = false;
		}
	}

	/* get code */
	const code = [];
	if (hasGhost) {
		let lat = Math.abs(Math.round(LAT * 10000)).toString(); // ~10m
		let lng = Math.abs(Math.round(LNG * 1000)).toString(); // ~40m

		while (lat.length < 7) {
			lat = '0' + lat;
		}
		while (lng.length < 6) {
			lng = '0' + lng;
		}

		code[0] = lng[2]; // init
		code[1] = 0; // kind
		code[2] = lng[5]; // energy
		code[3] = lat[3]; // init
		code[4] = lat[4]; // hp
		code[5] = 0; // kind
		code[6] = lng[4]; // leftLeg
		code[7] = Math.round(d.getMinutes()/10 + d.getHours()/10 + d.getDate()/10) % 10; // rightLeg
		code[8] = d.getMinutes() % 10; // leftArm
		code[9] = lat[6]; // rightArm
		code[10] = (lat[5]+d.getMonth()) % 10; // body
		code[11] = d.getDate() % 10; // head
		code[12] = d.getHours() % 10; // hp

		if (!isActived) {
			code[0] = 20;
			code[2] = 10;
			code[12] = 0;
			code[9] = 5;
		}
	}

	return [hasGhost, Fighter.ghosts[colorGhost], code.join('')];
}

Fighter.prototype.autoFight = 0;
Fighter.prototype.choiceAttack = ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
Fighter.prototype.choiceSupport = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
Fighter.prototype.target = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];

var geoloc = (function() {
	const lastLatLng = [0, 0, false];

	function success(position) {
		lastLatLng[0] = position.coords.latitude;
		lastLatLng[1] = position.coords.longitude;
		lastLatLng[2] = true;
	}
	function fail() {}

	return () => {
		navigator.geolocation.getCurrentPosition(success, fail);
		return lastLatLng;
	}
})();
geoloc();

const listAttack = [];

Fighter.prototype.choiceAttack.forEach(a => {
	Fighter.prototype.choiceSupport.forEach(b => {
		Fighter.prototype.target.forEach(c => {
			listAttack.push({
				name: '',
				attack: [a, b, c]
			});
		});
	});
});
listAttack.sort(() => Math.random());
listAttack.sort(() => Math.random());

/* compatibility check */
(self.compatibility || {}).fighter = true;