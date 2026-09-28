import nodemailer from "nodemailer";


async function main() {
  const n = Number(process.argv[2] ?? 2);
  const pairs: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = await nodemailer.createTestAccount();
    pairs.push(`${a.user}:${a.pass}`);
    console.log(`sender ${i + 1}: ${a.user}  (inbox: https://ethereal.email/login)`);
  }
  console.log(`\nETHEREAL_SENDERS=${pairs.join(",")}`);
}
main();
