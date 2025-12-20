class FakeOptions {
  constructor(args, message) {
    this.args = args || [];
    this.message = message;
  }

  getSubcommand() {
    return this.args[0] || null;
  }

  getString(name) {
    return this.args.slice(1).join(" ") || null;
  }

  getInteger() {
    const n = Number(this.getString());
    return Number.isInteger(n) ? n : null;
  }

  getBoolean() {
    const v = this.getString();
    if (!v) return null;
    return ["true", "yes", "1", "on"].includes(v.toLowerCase());
  }

  getChannel() {
    return this.message.mentions.channels.first() || null;
  }

  getUser() {
    return this.message.mentions.users.first() || null;
  }

  getRole() {
    return this.message.mentions.roles.first() || null;
  }

  getAttachment() {
    return this.message.attachments.first() || null;
  }
}

module.exports = FakeOptions;
