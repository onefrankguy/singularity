/* eslint-disable no-restricted-globals */
const Root = (typeof self === 'object' && self.self === self && self)
  || (typeof global === 'object' && global.global === global && global)
  || this;
/* eslint-enable no-restricted-globals */

const D6 = {};

D6.roll = () => Math.floor(Math.random() * 6) + 1;

D6.pick = (list) => {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
};

const Ship = {};

Ship.create = () => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f'];
  const ranks = ['1', '2', '3', '4', '5', '6'];

  const layout = {};

  const d6 = D6.roll();

  files.forEach((file) => {
    ranks.forEach((rank) => {
      layout[file + rank] = '';
    });
  });

  return {
    files,
    ranks,
    layout,
    d6,
  };
};

Ship.clone = ship => JSON.parse(JSON.stringify(ship));

Ship.set = (ship, tile, value) => {
  const copy = Ship.clone(ship);
  copy.layout[tile] = value;
  return copy;
};

const Rules = {};

Rules.possible = (ship, tile) => ship && tile && Object.keys(ship.layout).indexOf(tile) > -1;

Rules.collect = (ship, type) => Object.keys(ship.layout).filter(id => ship.layout[id].indexOf(type) > -1);

Rules.orthogonal = (ship, tile) => {
  const ofile = tile.slice(0, 1);
  const orank = tile.slice(-1);

  const ifile = ship.files.indexOf(ofile);
  const irank = ship.ranks.indexOf(orank);

  const tiles = [];

  let file;
  let rank;

  if (ifile - 1 >= 0 && ifile - 1 < ship.files.length) {
    file = ship.files[ifile - 1];
    tiles.push(`${file}${orank}`);
  }

  if (ifile + 1 >= 0 && ifile - 1 < ship.files.length) {
    file = ship.files[ifile + 1];
    tiles.push(`${file}${orank}`);
  }

  if (irank - 1 >= 0 && irank - 1 < ship.ranks.length) {
    rank = ship.ranks[irank - 1];
    tiles.push(`${ofile}${rank}`);
  }

  if (irank + 1 >= 0 && irank + 1 < ship.ranks.length) {
    rank = ship.ranks[irank + 1];
    tiles.push(`${ofile}${rank}`);
  }

  return tiles;
};

Rules.repaired = ship => Rules.collect(ship, 'meteor').length <= 5;

Rules.repairable = ship => Rules.collect(ship, 'meteor');

Rules.repair = (ship, tile) => {
  if (Rules.repaired(ship)) {
    return Ship.clone(ship);
  }

  const repairable = Rules.repairable(ship);
  if (repairable.indexOf(tile) < 0) {
    return Ship.clone(ship);
  }

  return Ship.set(ship, tile, '');
};

Rules.podded = ship => Rules.collect(ship, 'pod').length > 0;

Rules.poddable = (ship) => {
  const meteors = Rules.collect(ship, 'meteor');
  const orthogonal = meteors.reduce((acc, id) => acc.concat(Rules.orthogonal(ship, id)), []);
  const empty = orthogonal.filter(id => ship.layout[id] === '');

  return empty;
};

Rules.pod = (ship, tile) => {
  if (Rules.podded(ship)) {
    return Ship.clone(ship);
  }

  const poddable = Rules.poddable(ship);
  if (poddable.indexOf(tile) < 0) {
    return Ship.clone(ship);
  }

  return Ship.set(ship, tile, 'pod north');
};

Rules.edges = (ship, direction) => {
  const files = ship.files.slice();
  const ranks = ship.ranks.slice().reverse();

  let file;
  let rank;

  if (direction === 'north') {
    [rank] = ranks;
    return files.map(f => f + rank);
  }

  if (direction === 'east') {
    file = files[files.length - 1];
    return ranks.map(r => file + r);
  }

  if (direction === 'south') {
    rank = ranks[ranks.length - 1];
    return files.map(f => f + rank);
  }

  if (direction === 'west') {
    [file] = files;
    return ranks.map(r => file + r);
  }

  return [];
};

Rules.crewed = ship => !!ship.north && !!ship.east && !!ship.south && !!ship.west;

Rules.crewable = (ship, direction) => {
  const empty = Object.keys(ship.layout).filter(id => ship.layout[id] === '');

  if (direction === 'north') {
    return Rules.edges(ship, 'north').filter(id => empty.indexOf(id) > -1);
  }

  if (direction === 'east') {
    return Rules.edges(ship, 'east').filter(id => empty.indexOf(id) > -1);
  }

  if (direction === 'south') {
    return Rules.edges(ship, 'south').filter(id => empty.indexOf(id) > -1);
  }

  if (direction === 'west') {
    return Rules.edges(ship, 'west').filter(id => empty.indexOf(id) > -1);
  }

  return [];
};

Rules.crew = (ship, tile) => {
  const copy = Ship.clone(ship);

  if (Rules.crewed(ship)) {
    return copy;
  }

  const north = Rules.crewable(ship, 'north');
  if (copy.north === undefined) {
    if (north.indexOf(tile) > -1) {
      copy.north = tile;
      return Ship.set(copy, tile, 'crew north');
    }
    return copy;
  }

  const east = Rules.crewable(ship, 'east');
  if (copy.east === undefined) {
    if (east.indexOf(tile) > -1) {
      copy.east = tile;
      return Ship.set(copy, tile, 'crew east');
    }
    return copy;
  }

  const south = Rules.crewable(ship, 'south');
  if (copy.south === undefined) {
    if (south.indexOf(tile) > -1) {
      copy.south = tile;
      return Ship.set(copy, tile, 'crew south');
    }
    return copy;
  }

  const west = Rules.crewable(ship, 'west');
  if (copy.west === undefined) {
    if (west.indexOf(tile) > -1) {
      copy.west = tile;
      return Ship.set(copy, tile, 'crew west');
    }
    return copy;
  }

  return copy;
};

Rules.filled = ship => Object.keys(ship.layout).filter(id => ship.layout[id] === '').length < 1;

Rules.fillable = (ship) => {
  const file = ship.files[ship.d6 - 1];
  const rank = ship.ranks[ship.d6 - 1];
  const empty = Object.keys(ship.layout).filter(id => ship.layout[id] === '');
  const valid = empty.filter(id => id.slice(0, 1) === file || id.slice(-1) === rank);
  return valid.length > 0 ? valid : empty;
};

Rules.fill = (ship, tile, item) => {
  if (Rules.filled(ship)) {
    return Ship.clone(ship);
  }

  if (Rules.fillable(ship).indexOf(tile) < 0) {
    return Ship.clone(ship);
  }

  return Ship.set(ship, tile, item);
};

Rules.clear = (ship, tile) => {
  if (Rules.possible(ship, tile)) {
    return Ship.set(ship, tile, '');
  }

  return Ship.clone(ship);
};

Rules.rotate = (ship, tile) => {
  if (!Rules.possible(ship, tile)) {
    return Ship.clone(ship);
  }

  const directions = ['north', 'east', 'south', 'west'];
  const type = ship.layout[tile].split(' ').filter(x => directions.indexOf(x) < 0).join(' ');

  if (type === '' || type === 'meteor' || type === 'crew') {
    return Ship.clone(ship);
  }

  const east = ship.layout[tile].indexOf('east') > -1;
  if (east) {
    return Ship.set(ship, tile, `${type} south`);
  }

  const south = ship.layout[tile].indexOf('south') > -1;
  if (south) {
    return Ship.set(ship, tile, `${type} west`);
  }

  const west = ship.layout[tile].indexOf('west') > -1;
  if (west) {
    return Ship.set(ship, tile, `${type} north`);
  }

  return Ship.set(ship, tile, `${type} east`);
};

const AI = {};

AI.exits = (ship, tile) => {
  let [type, direction] = ship.layout[tile].split(' ');
  if (direction === undefined) {
    direction = 'north';
  }
  type = `${type} ${direction}`.trim();

  switch (type) {
    case 'hall north':
    case 'hall south':
    case 'pod north':
    case 'pod south':
    case 'crew north':
    case 'crew south':
      return ['east', 'west'];

    case 'hall east':
    case 'hall west':
    case 'pod east':
    case 'pod west':
    case 'crew east':
    case 'crew west':
      return ['north', 'south'];

    case 'corner north':
      return ['south', 'west'];

    case 'corner east':
      return ['north', 'west'];

    case 'corner south':
      return ['north', 'east'];

    case 'corner west':
      return ['east', 'south'];

    case 'tee north':
      return ['east', 'south', 'west'];

    case 'tee east':
      return ['north', 'south', 'west'];

    case 'tee south':
      return ['north', 'east', 'west'];

    case 'tee west':
      return ['north', 'east', 'south'];

    case 'junction north':
    case 'junction east':
    case 'junction south':
    case 'junction west':
      return ['north', 'east', 'south', 'west'];

    default:
      return []
  }
};

AI.move = (ship, tile, direction) => {
  const file = tile.slice(0, 1);
  const rank = tile.slice(-1);

  const ifile = ship.files.indexOf(file);
  const irank = ship.ranks.indexOf(rank);

  if (ifile < 0 || irank < 0) {
    return tile;
  }

  let index;

  switch (direction) {
    case 'north':
      index = irank + 1;
      return index < ship.ranks.length ? file + ship.ranks[index] : tile;

    case 'east':
      index = ifile + 1;
      return index < ship.files.length ? ship.files[index] + rank : tile;

    case 'south':
      index = irank - 1;
      return index > -1 ? file + ship.ranks[index] : tile;

    case 'west':
      index = ifile - 1;
      return index > -1 ? ship.files[index] + rank : tile;

    default:
      return tile;
  }
};

AI.fill = (ship, tile, filled = []) => {
  if (filled.indexOf(tile) > -1) {
    return filled;
  }

  let next = filled.concat(tile);
  AI.exits(ship, tile).forEach((direction) => {
    let exit = AI.move(ship, tile, direction);
    if (exit !== undefined && exit !== tile) {
      AI.exits(ship, exit).forEach((dir) => {
        if (direction === 'north' && dir === 'south'
          || direction === 'south' && dir === 'north'
          || direction === 'east' && dir === 'west'
          || direction === 'west' && dir === 'east') {
          next = AI.fill(ship, exit, next);
        }
      });
    }
  });

  return next;
};

AI.rescued = (ship) => {
  const pod = Rules.collect(ship, 'pod');
  const crew = Rules.collect(ship, 'crew');
  const walkable = pod.reduce((acc, id) => AI.fill(ship, id), []);
  const rescued = crew.filter(id => walkable.indexOf(id) > -1);
  return rescued;
};

AI.playable = (ship, type) => {
  if (type === 'wrench') {
    return Rules.repairable(ship);
  }

  if (type === 'pod') {
    return Rules.poddable(ship);
  }

  if (type === 'north') {
    return Rules.crewable(ship, 'north');
  }

  if (type === 'east') {
    return Rules.crewable(ship, 'east');
  }

  if (type === 'south') {
    return Rules.crewable(ship, 'south');
  }

  if (type === 'west') {
    return Rules.crewable(ship, 'west');
  }

  if (AI.rescued(ship).length < 4) {
    return Rules.fillable(ship);
  }

  return [];
};

AI.create = () => {
  const ship = Ship.create();

  ship.ranks.forEach((rank) => {
    const file = D6.pick(ship.files);
    ship.layout[file + rank] = 'meteor';
  });

  const meteor = D6.pick(AI.playable(ship, 'wrench'));
  ship.layout[meteor] = '';

  return ship;
};

const Engine = {};

Engine.corridors = [];

Engine.tick = (ship, tile, item) => {
  if (!Rules.repaired(ship)) {
    return Rules.repair(ship, tile);
  }

  if (!Rules.podded(ship)) {
    return Rules.pod(ship, tile);
  }

  if (!Rules.crewed(ship)) {
    return Rules.crew(ship, tile);
  }

  if (!Rules.filled(ship)) {
    return Rules.fill(ship, tile, item);
  }

  return Ship.clone(ship);
};

Engine.item = (ship) => {
  if (!Rules.repaired(ship)) {
    return 'wrench';
  }

  if (!Rules.podded(ship)) {
    return 'pod';
  }

  if (ship.north === undefined) {
    return 'north';
  }

  if (ship.east === undefined) {
    return 'east';
  }

  if (ship.south === undefined) {
    return 'south';
  }

  if (ship.west === undefined) {
    return 'west';
  }

  let item = D6.pick(Engine.corridors);
  if (item === undefined) {
    Engine.corridors = ['hall', 'corner', 'tee', 'junction'];
    item = D6.pick(Engine.corridors);
  }

  Engine.corridors = Engine.corridors.filter(id => id !== item);
  return item;
};

const Renderer = {};

Renderer.render = (ship, playable) => {
  const $ = Root.jQuery;

  Object.keys(ship.layout).forEach((id) => {
    const element = $(`#${id}`);
    element.removeClass('wrench meteor crew pod');
    element.removeClass('north east south west');
    element.removeClass('hall corner tee junction');
    element.removeClass('playable rescued');
    element.addClass(ship.layout[id]);
  });

  ['north', 'east', 'south', 'west'].forEach((direction) => {
    const crew = Rules.edges(ship, direction);
    crew.forEach(id => $(`#${direction}-${id}`).removeClass('crew north east south west'));
  });

  AI.rescued(ship).forEach(id => $(`#${id}`).addClass('rescued'));
  playable.forEach(id => $(`#${id}`).addClass('playable'));
};

Renderer.invalidate = (ship, playable) => {
  requestAnimationFrame(() => Renderer.render(ship, playable));
};

(function game() {
  let ship;
  let prev;
  let next;
  let item;

  function reset() {
    ship = AI.create();
    prev = undefined;
    next = undefined;
    item = Engine.item(ship);
  }

  function onShip(element) {
    if (AI.playable(ship).length <= 0) {
      return;
    }

    const tile = element.unwrap().id;

    if (next !== undefined && prev === tile) {
      next = Rules.rotate(next, tile);
    } else {
      next = Engine.tick(ship, tile, item);
    }

    prev = tile;
    Renderer.invalidate(next, AI.playable(ship, item));
  }

  function onScan() {
    if (next !== undefined) {
      ship = next;
      ship.d6 = D6.roll();
      prev = undefined;
      next = undefined;
      item = Engine.item(ship);
      Renderer.invalidate(ship, AI.playable(ship, item));
    }
  }

  function tileHTML(count) {
    let html = '';

    for (let i = 0; i < count; i += 1) {
      html += '<div></div>';
    }

    return html;
  }

  function drawShip() {
    const $ = Root.jQuery;
    let html = '';

    const files = ship.files.slice();
    const ranks = ship.ranks.slice().reverse();

    ranks.forEach((rank) => {
      files.forEach((file) => {
        html += `<div id="${file}${rank}">`;
        html += tileHTML(9);
        html += '</div>';
      });
    });

    $('#ship').html(html);

    html = '';

    ranks.forEach((rank) => {
      files.forEach((file) => {
        html += '<div></div>';
      });
    });

    $('#board').html(html);
  }

  function drawTiles() {
    const $ = Root.jQuery;
    let html = '';

    const tiles = [
      'meteor', 'meteor', 'meteor', 'meteor', 'meteor',
      'pod',
      'crew', 'crew', 'crew', 'crew',
      'hall', 'hall', 'hall', 'hall', 'hall', 'hall', 'hall', 'hall',
      'corner', 'corner', 'corner', 'corner', 'corner', 'corner', 'corner', 'corner',
      'tee', 'tee', 'tee', 'tee', 'tee', 'tee', 'tee', 'tee',
      'junction', 'junction', 'junction', 'junction', 'junction', 'junction', 'junction', 'junction'
    ];

    tiles.forEach((type) => {
      html += `<div class="${type} north">`;
      html += tileHTML(9);
      html += '</div>';
    });

    $('#tiles').html(html);
  }

  function play() {
    const $ = Root.jQuery;

    reset();
    drawShip();
    drawTiles();

    ship.files.forEach((file) => {
      ship.ranks.forEach((rank) => {
        $(`#${file}${rank}`).click(onShip);
      });
    });

    $('#scan').html(tileHTML(9));
    $('#scan').click(onScan);

    Renderer.invalidate(ship, AI.playable(ship, item));
  }

  Root.onload = play;
}());

(function $() {
  function Fn(selector) {
    if (selector instanceof Fn) {
      return selector;
    }

    this.element = selector;

    if (typeof selector === 'string') {
      if (selector.indexOf('#') === 0) {
        this.element = document.getElementById(selector.slice(1));
      }
    }

    return this;
  }

  Fn.prototype.addClass = function addClass(klass) {
    if (this.element && this.element.classList && klass) {
      const klasses = klass.split(' ').filter(k => k);
      klasses.forEach(k => this.element.classList.add(k));
    }
  };

  Fn.prototype.removeClass = function removeClass(klass) {
    if (this.element && this.element.classList) {
      const klasses = klass.split(' ').filter(k => k);
      klasses.forEach(k => this.element.classList.remove(k));
    }
  };

  Fn.prototype.toggleClass = function toggleClass(klass) {
    if (this.element && this.element.classList) {
      this.element.classList.toggle(klass);
    }
  };

  Fn.prototype.html = function html(value) {
    if (this.element) {
      this.element.innerHTML = value;
    }
  };

  Fn.prototype.click = function click(start, end) {
    const self = this;

    if (this.element) {
      if ('ontouchstart' in document.documentElement === false) {
        this.element.onmousedown = function onmousedown(mouseDownEvent) {
          if (start) {
            start(self, mouseDownEvent);
          }
          document.onmousemove = function onmousemove(e) {
            e.preventDefault();
          };
          document.onmouseup = function onmouseup(e) {
            if (end) {
              end(self, e);
            }
            document.onmousemove = undefined;
            document.onmouseup = undefined;
          };
        };
      } else {
        this.element.ontouchstart = function ontouchstart(touchStartEvent) {
          if (start) {
            start(self, touchStartEvent);
          }
          document.ontouchmove = function ontouchmove(e) {
            e.preventDefault();
          };
          document.ontouchend = function ontouchend(e) {
            if (end) {
              end(self, e);
            }
            document.ontouchmove = undefined;
            document.ontouchend = undefined;
          };
        };
      }
    }
  };

  Fn.prototype.unwrap = function unwrap() {
    return this.element;
  };

  function root(selector) {
    return new Fn(selector);
  }

  Root.jQuery = root;
}());

if (typeof module === 'object') {
  module.exports = { Ship, Rules, AI };
}
