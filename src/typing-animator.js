class TypingAnimatorEventTarget {

  constructor() {
    this.listeners = {}
  }

  addEventListener(type, callback) {
    if (!(type in this.listeners)) {
      this.listeners[type] = []
    }
    this.listeners[type].push(callback)
  }

  removeEventListener(type, callback) {
    if (!(type in this.listeners)) {
      return
    }
    const stack = this.listeners[type]
    for (let i = 0, l = stack.length; i < l; i++) {
      if (stack[i] === callback) {
        stack.splice(i, 1)
        return
      }
    }
  }

  dispatchEvent(event) {
    if (!(event.type in this.listeners)) {
      return true
    }

    const stack = this.listeners[event.type].slice()

    for (let i = 0, l = stack.length; i < l; i++) {
      stack[i].call(this, event)
    }
    return !event.defaultPrevented
  }
}

class TypingAnimator extends TypingAnimatorEventTarget {

  constructor(opts, steps) {
    super();

    if (!(Object.keys(opts).length > 0)) {
      console.error('the first parameter must be an object');
      return;
    }
    if (!Array.isArray(steps)) {
      console.error('the second parameter must be an array');
      return;
    }

    this.steps = steps;

    let options = TypingAnimator.prototype.DefaultOptions;

    Object.assign(options, opts);

    if (typeof options.target == 'string' && options.target.length > 0 && document.querySelector(options.target) != null) {
      options.target = document.querySelector(options.target);
      options.targetNodeName = options.target.nodeName.toLowerCase()
      let maxValue = this._getLongestText(this.steps);
      let insideOfTarget = document.createElement('span');
      insideOfTarget.innerHTML = options.target.innerHTML;
      let placeholder = document.createElement('div');
      placeholder.textContent = maxValue;
      placeholder.style.position = 'absolute';
      placeholder.style.visibility = 'hidden';
      insideOfTarget.append(placeholder);
      options.target.innerHTML = '';
      options.target.append(insideOfTarget);
      if (options.fixedWidth) {
        options.target.setAttribute("style", "width:" + placeholder.offsetWidth + "px; display: inline-block;");
      }
      placeholder.remove();


      var cursorStyle = document.createElement('style');
      cursorStyle.innerHTML = TypingAnimator.prototype._cursorStyle.replace('{blinkingDelay}', options.blinkingDelay);
      document.querySelector('head').append(cursorStyle);

      if (options.cursor || options.animatedCursor) {
        options.target.querySelector(':scope > ' + options.targetNodeName).classList.add('w-cursor');
        if (options.animatedCursor) {
          console.log('animated');
          options.target.querySelector(':scope > ' + options.targetNodeName).classList.add('w-animated-cursor');
        }
      }
    } else {
      console.log('please provide an existing target');
      return;
    }

    if (options.revert) {
      console.log(this.steps);

      this.steps = [
        ...this.steps,
        ...this.steps.reverse()
      ];

      console.log(this.steps);
    }

    this.options = options;
    this.storage = {};
  }

  async animate() {
    this.dispatchEvent({
      type: 'animation:start'
    });
    for (const [index, step] of this.steps.entries()) {
      let command, value;

      if (typeof step == 'string') {
        command = step
      } else {
        command = Object.keys(step)[0];
        value = step[command];
      }

      if (command in TypingAnimator.prototype.Commands) {
        await TypingAnimator.prototype.Commands[command](value, this);
        if (this.options.stepDelay > 0 && !(['wait', false].includes(this._getStepName(index + 1))))
          await TypingAnimator.prototype.Commands.wait(this.options.stepDelay, this);
      } else {
        console.warn(`TypingAnimator: Error unknown command "${command}"`)
      }
    }
    if (this.options.loop) {
      if (this.options.loopDelay > 0)
        await TypingAnimator.prototype.Commands.wait(this.options.loopDelay, this);
      this.dispatchEvent({
        type: 'animation:loop'
      });
      return this.animate();
    }
    this.dispatchEvent({
      type: 'animation:end'
    });

  };

  _getLongestText() {
    return this.steps.reduce((maxValue, step) => {
      if (['text', 'from', 'to'].includes(Object.keys(step)[0])) {
        let value = step[Object.keys(step)[0]]
        return (value.length > maxValue.length) ? value : maxValue;
      }
      return maxValue
    }, '')
  }

  _getStepName(index) {
    if (!(this.steps[index]))
      return false
    if (typeof this.steps[index] == 'string')
      return this.steps[index]
    return Object.keys(this.steps[index])[0];
  }
}

TypingAnimator.prototype.DefaultOptions = {
  fixedWidth: false,
  target: '',
  revert: false,
  cursor: false,
  animatedCursor: false,
  loop: false,
  stepDelay: 1000,
  loopDelay: 0,
  blinkingDelay: '1s'
};

TypingAnimator.prototype.Commands = {
  wait(value, _instance) {
    return new Promise(resolve => setTimeout(resolve, value))
  },
  text(value, instance) {
    instance.options.target.querySelector(':scope > ' + instance.options.targetNodeName).textContent = value;
  },
  from(value, instance) {
    instance.options.target.querySelector(':scope > ' + instance.options.targetNodeName).textContent = value;
    instance.storage.from = value;
    console.log(this);
  },
  async to(value, instance) {
    console.log('from', instance.storage.from, '-->', value);
    let from = instance.storage.from;
    let to = value;
    let prefix = false;
    let suffix = false;

    if(from.length<to.length) {
      if(to.startsWith(from)) {
        prefix = from;
        to = to.replace(from, '');
      }else if(to.endsWith(from)){
        suffix = from;
        to = to.replace(from, '');
        console.log('EHEH', to);
      }
    }

    console.log(prefix, suffix);
    
    for (const letter of to.split('')) {
      if (suffix){
        suffix = letter + suffix + '';
        console.log(suffix);
        instance.options.target.querySelector(':scope > ' + instance.options.targetNodeName).textContent = suffix;
      }else if (prefix){
        prefix += letter;
        instance.options.target.querySelector(':scope > ' + instance.options.targetNodeName).textContent = prefix;
      }

      if (instance.options.stepDelay > 0)
        await instance.constructor.Commands.wait(instance.options.stepDelay, instance);
    }
  },
  addCursor(_value, instance) {
    console.log(instance);
    instance.options.target.querySelector(':scope > ' + instance.options.targetNodeName).classList.add('w-cursor');
  },
  addAnimatedCursor(_value, instance) {
    instance.options.target.querySelector(':scope > ' + instance.options.targetNodeName).classList.add('w-animated-cursor');
  },
  removeCursor(_value, instance) {
    instance.options.target.querySelector(':scope > ' + instance.options.targetNodeName).classList.remove('w-cursor');
  },
  removeAnimatedCursor(_value, instance) {
    instance.options.target.querySelector(':scope > ' + instance.options.targetNodeName).classList.remove('w-animated-cursor');
  },
};

TypingAnimator.prototype._cursorStyle = `
.w-cursor::after {
  content: "|";
  position:absolute;
}

.w-animated-cursor::after {
  -webkit-animation: blink {blinkingDelay} infinite step-start;
  animation: blink {blinkingDelay} infinite step-start;
}

@-webkit-keyframes blink {
  50% {
    opacity: 0;
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}`;