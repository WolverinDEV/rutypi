export const displayFlags = (flag: number, flags: object) => {
    const activeFlags = [];
    for(const key of Object.keys(flags)) {
        const keyNumeric = parseInt(key);
        if(isNaN(keyNumeric)) {
            continue;
        }

        if((flag & keyNumeric) === keyNumeric) {
            activeFlags.push(flags[keyNumeric]);
        }
    }
    return activeFlags.join(", ") || "no flags";
}