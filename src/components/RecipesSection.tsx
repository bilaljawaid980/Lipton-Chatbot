import heroImage from "@/assets/hero-tea.jpg";

const recipes = [
  {
    id: 1,
    title: "Classic Iced Tea",
    description: "A refreshing summer favorite with fresh lemon.",
    time: "10 min",
    image: heroImage,
  },
  {
    id: 2,
    title: "Honey Green Tea",
    description: "Sweet and soothing with natural honey.",
    time: "5 min",
    image: heroImage,
  },
  {
    id: 3,
    title: "Peachy Tea Punch",
    description: "Perfect for parties and gatherings.",
    time: "15 min",
    image: heroImage,
  },
];

const RecipesSection = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <div>
            <h2 className="section-title mb-2">Tea Recipes</h2>
            <p className="text-muted-foreground">
              Discover delicious ways to enjoy your tea.
            </p>
          </div>
          <button className="btn-lipton mt-4 md:mt-0">
            VIEW ALL RECIPES
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="group relative overflow-hidden rounded-2xl cursor-pointer"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="inline-block px-3 py-1 bg-secondary text-secondary-foreground text-xs font-semibold rounded-full mb-3">
                  {recipe.time}
                </span>
                <h3 className="font-display text-xl font-semibold text-primary-foreground mb-2">
                  {recipe.title}
                </h3>
                <p className="text-primary-foreground/80 text-sm">
                  {recipe.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecipesSection;
