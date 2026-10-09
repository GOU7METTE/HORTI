export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-20 text-stone-900">
      <div className="mx-auto max-w-3xl">
        <p className="font-semibold tracking-widest text-emerald-800">HORTI</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-6xl">Smart Agriculture</h1>
        <p className="mt-6 text-xl leading-relaxed">
          Exploring plant disease detection through computer vision.
        </p>
        <section className="mt-10 rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Project foundation</h2>
          <p className="mt-3 leading-relaxed">
            This application is in development. Leaf uploads, disease predictions,
            and reviewed crop information are planned for the MVP.
          </p>
          <p className="mt-3 text-sm text-stone-600">
            Future model predictions will be educational estimates, not confirmed diagnoses.
          </p>
        </section>
      </div>
    </main>
  );
}
