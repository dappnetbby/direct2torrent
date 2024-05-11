
export default function patchWarnings() {
  const originalEmit = process.emit;
  // @ts-ignore
  process.emit = function (name, data, ...args) {
    if (
      name === `warning` &&
      typeof data === `object` &&
      data.name === `ExperimentalWarning` 
      //if you want to only stop certain messages, test for the message here:
      //&& data.message.includes(`Fetch API`)
    ) {
      return false;
    }
    return originalEmit.apply(process, arguments);
  };
  
}