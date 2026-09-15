export const metadata = {
  title: "MedPhysio Tutorials | Physiology Made Clear",
  description:
    "Clear, mechanism-focused Physiology tutorials for university and medical-school students.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/assets/img/favicon.svg" />
        <link rel="stylesheet" href="/assets/css/styles.css" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
