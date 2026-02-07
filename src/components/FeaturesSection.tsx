const features = [
  {
    icon: "🍃",
    title: "100% Natural",
    description: "Our teas are made with carefully selected tea leaves from the finest gardens.",
  },
  {
    icon: "❤️",
    title: "Heart Healthy",
    description: "Drinking tea as part of a healthy lifestyle may help support heart health.",
  },
  {
    icon: "🌍",
    title: "Sustainably Sourced",
    description: "We're committed to sustainable practices and supporting farming communities.",
  },
  {
    icon: "✨",
    title: "Quality Promise",
    description: "Over 130 years of expertise in crafting the perfect cup of tea.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-16 md:py-24 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="section-title mb-4">Why Choose Lipton</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            For over a century, we've been dedicated to bringing you the finest tea experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center p-6 bg-background rounded-2xl shadow-soft hover:shadow-warm transition-shadow duration-300"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
