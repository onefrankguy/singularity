const Ship = {};

Ship.create = () => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f'];
  const ranks = ['1', '2', '3', '4', '5', '6'];

  const layout = {};

  files.forEach((file) => {
    ranks.forEach((rank) => {
      layout[file + rank] = '';
    });
  });

  return {
    files,
    ranks,
    layout,
  };
};

Ship.clone = ship => JSON.parse(JSON.stringify(ship));

Ship.set = (ship, tile, value) => {
  const copy = Ship.clone(ship);
  copy.layout[tile] = value;
  return copy;
};

const Renderer = {};

Renderer.render = (ship) => {
  const $ = window.jQuery;

  Object.keys(ship.layout).forEach((id) => {
    const element = $(`#${id}`);
    element.removeClass('meteor crew pod');
    element.removeClass('north east south west');
    element.addClass(ship.layout[id]);
  });
};

Renderer.invalidate = (ship) => {
  requestAnimationFrame(() => Renderer.render(ship));
};

const Rules = {};

Rules.isCenter = (ship, tile) => {
  const file = tile.slice(0, 1);
  const rank = tile.slice(-1);

  const centerFiles = ship.files.slice(1, -1);
  const centerRanks = ship.ranks.slice(1, -1);

  return centerFiles.indexOf(file) > -1 && centerRanks.indexOf(rank) > -1;
};

Rules.isEdge = (ship, tile) => !Rules.isCenter(ship, tile);

Rules.isCorner = (ship, tile) => {
  const file = tile.slice(0, 1);
  const rank = tile.slice(-1);

  const firstFile = ship.files.slice(0, 1)[0];
  const lastFile = ship.files.slice(-1)[0];

  const firstRank = ship.ranks.slice(0, 1)[0];
  const lastRank = ship.ranks.slice(-1)[0];

  return (file === firstFile || file === lastFile) && (rank === firstRank || rank === lastRank);
};

Rules.onGrid = (ship, tile) => {
  if (!tile) {
    return false;
  }

  const file = tile.slice(0, 1);
  const rank = tile.slice(-1);

  return ship.files.indexOf(file) > -1 && ship.ranks.indexOf(rank) > -1;
};

Rules.needsCrew = (ship) => {
  // There are a max of two crew on the ship.
  const crew = Object.keys(ship.layout).filter(id => ship.layout[id].indexOf('crew') > -1);
  return crew.length < 2;
};

Rules.canAddCrew = (ship, tile) => {
  if (!Rules.onGrid(ship, tile)) {
    return false;
  }

  // Crew can only be added to an empty space on the ship.
  if (ship.layout[tile] !== '') {
    return false;
  }

  // Crew must go in the center.
  if (!Rules.isCenter(ship, tile)) {
    return false;
  }

  return Rules.needsCrew(ship);
};

Rules.addCrew = (ship, tile) => {
  if (Rules.canAddCrew(ship, tile)) {
    return Ship.set(ship, tile, 'crew');
  }

  return Ship.clone(ship);
};

Rules.needsMeteor = (ship) => {
  // There are a max of three meteors on the ship.
  const meteors = Object.keys(ship.layout).filter(id => ship.layout[id].indexOf('meteor') > -1);
  return meteors.length < 3;
};

Rules.canAddMeteor = (ship, tile) => {
  if (!Rules.onGrid(ship, tile)) {
    return false;
  }

  // Meteors can only be added to an empty space on the ship.
  if (ship.layout[tile] !== '') {
    return false;
  }

  return Rules.needsMeteor(ship);
};

Rules.addMeteor = (ship, tile) => {
  if (Rules.canAddMeteor(ship, tile)) {
    return Ship.set(ship, tile, 'meteor');
  }

  return Ship.clone(ship);
};

Rules.needsPod = (ship) => {
  // There is only one escape pod on the ship.
  const pods = Object.keys(ship.layout).filter(id => ship.layout[id].indexOf('pod') > -1);
  return pods.length < 1;
};

Rules.canAddPod = (ship, tile) => {
  if (!Rules.onGrid(ship, tile)) {
    return false;
  }

  // Escape pods can only be added to an empty space on the ship.
  if (ship.layout[tile] !== '') {
    return false;
  }

  // Escape pods can only be added to the edge of the ship.
  if (!Rules.isEdge(ship, tile)) {
    return false;
  }

  return Rules.needsPod(ship);
};

Rules.addPod = (ship, tile) => {
  if (Rules.canAddPod(ship, tile)) {
    return Ship.set(ship, tile, 'pod');
  }

  return Ship.clone(ship);
};

Rules.clear = (ship, tile) => {
  if (Rules.onGrid(ship, tile)) {
    return Ship.set(ship, tile, '');
  }

  return Ship.clone(ship);
};

Rules.rotate = (ship, tile) => {
  if (!Rules.onGrid(ship, tile)) {
    return Ship.clone(ship);
  }

  const directions = ['north', 'east', 'south', 'west'];
  const type = ship.layout[tile].split(' ').filter(x => directions.indexOf(x) < 0).join(' ');

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

const Engine = {};

Engine.tick = (ship, prev, tile) => {
  let next = Rules.clear(ship, prev);

  if (prev === tile && Rules.onGrid(ship, tile)) {
    next = Rules.rotate(ship, tile);
    return [next, prev];
  }

  if (Rules.needsMeteor(next)) {
    if (Rules.canAddMeteor(next, tile)) {
      next = Rules.addMeteor(next, tile);
      return [next, tile];
    }

    return [ship, prev];
  }

  if (Rules.needsCrew(next)) {
    if (Rules.canAddCrew(next, tile)) {
      next = Rules.addCrew(next, tile);
      return [next, tile];
    }

    return [ship, prev];
  }

  if (Rules.needsPod(next)) {
    if (Rules.canAddPod(next, tile)) {
      next = Rules.addPod(next, tile);
      return [next, tile];
    }

    return [ship, prev];
  }

  return [ship, prev];
};

(function game() {
  let ship = Ship.create();
  let picked;

  function reset() {
    ship = Ship.create();
    picked = undefined;
  }

  function onShip(element) {
    [ship, picked] = Engine.tick(ship, picked, element.unwrap().id);
    Renderer.invalidate(ship);
  }

  function onScan() {
    picked = undefined;
  }

  function tileHTML() {
    let html = '';

    for (let i = 0; i < 9; i += 1) {
      html += '<div></div>';
    }

    return html;
  }

  function drawShip() {
    const $ = window.jQuery;
    let html = '';

    const files = ship.files.slice();
    const ranks = ship.ranks.slice().reverse();

    ranks.forEach((rank) => {
      files.forEach((file) => {
        html += `<div id="${file}${rank}">`;
        html += tileHTML();
        html += '</div>';
      });
    });

    $('#ship').html(html);
  }

  function play() {
    const $ = window.jQuery;

    drawShip();

    ship.files.forEach((file) => {
      ship.ranks.forEach((rank) => {
        $(`#${file}${rank}`).click(onShip);
      });
    });

    $('#scan').html(tileHTML());
    $('#scan').click(onScan);

    reset();
    Renderer.invalidate(ship);
  }

  window.onload = play;
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

  window.jQuery = root;
}());
