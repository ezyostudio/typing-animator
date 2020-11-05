class TypingAnimatorEventTarget {

  listeners = null

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

    let options = this.constructor.DefaultOptions;

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
      cursorStyle.innerHTML = this.constructor._cursorStyle;
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
  }

  static DefaultOptions = {
    fixedWidth: false,
    target: '',
    revert: false,
    cursor: false,
    animatedCursor: false,
    loop: false,
    loopDelay: 0
  };

  static Commands = {
    wait(value, _options) {
      return new Promise(resolve => setTimeout(resolve, value))
    },
    text(value, options) {
      options.target.querySelector(':scope > ' + options.targetNodeName).textContent = value;
    },
    addCursor(_value, options) {
      options.target.querySelector(':scope > ' + options.targetNodeName).classList.add('w-cursor');
    },
    addAnimatedCursor(_value, options) {
      options.target.querySelector(':scope > ' + options.targetNodeName).classList.add('w-animated-cursor');
    },
    removeCursor(_value, options) {
      options.target.querySelector(':scope > ' + options.targetNodeName).classList.remove('w-cursor');
    },
    removeAnimatedCursor(_value, options) {
      options.target.querySelector(':scope > ' + options.targetNodeName).classList.remove('w-animated-cursor');
    },
  };

  static _cursorStyle = `
  .w-cursor::after {
    content: "|";
  }

  .w-animated-cursor::after {
    -webkit-animation: blink 1s infinite step-start;
    animation: blink 1s infinite step-start;
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


  async animate() {
    this.dispatchEvent({
      type: 'animation:start'
    });
    for (const step of this.steps) {
      let command, value;

      if (typeof step == 'string') {
        command = step
      } else {
        command = Object.keys(step)[0];
        value = step[command];
      }

      if (command in this.constructor.Commands) {
        await this.constructor.Commands[command](value, this.options);
      } else {
        console.warn(`TypingAnimator: Error unknown command "${command}"`)
      }
    }
    if (this.options.loop) {
      if (this.options.loopDelay > 0)
        await this.constructor.Commands.wait(this.options.loopDelay, this.options);
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
      if (Object.keys(step)[0] == 'text') {
        let value = step[Object.keys(step)[0]]
        return (value.length > maxValue.length) ? value : maxValue;
      }
      return maxValue
    }, '')
  }
}