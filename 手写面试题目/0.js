const obj = {
  name: "Vue",
  get greeting() {
    return "Hello, " + this.name; // this 的指向至关重要
  },
};

const proxy = new Proxy(obj, {
  get(target, key, receiver) {
    return target[key];
  },
});

console.log(proxy.greeting); // "Hello, Vue"（正确！this 指向 proxy）
