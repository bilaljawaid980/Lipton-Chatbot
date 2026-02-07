import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import ProductGrid from "@/components/ProductGrid";
import FeaturesSection from "@/components/FeaturesSection";
import RecipesSection from "@/components/RecipesSection";
import NewsletterSection from "@/components/NewsletterSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroCarousel />
        <ProductGrid />
        <FeaturesSection />
        <RecipesSection />
        <NewsletterSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
