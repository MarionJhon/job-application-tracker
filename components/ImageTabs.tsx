"use client";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const ImageTabs = () => {
  const [activeTab, setActiveTab] = useState("organize");
  const tabs = [
    { id: "organize", label: "Organize Application" },
    { id: "hired", label: "Get Hired" },
    { id: "boards", label: "Manage Boards" },
  ];
  const images = [
    {
      src: "/hero-images/hero1.png",
      alt: "Organize Application",
      title: "organize",
    },
    { src: "/hero-images/hero2.png", alt: "Get Hired", title: "hired" },
    { src: "/hero-images/hero3.png", alt: "Manage Boards", title: "boards" },
  ];
  return (
    <section className="border-t bg-white py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex gap-2 justify-center mb-8">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-lg border-gray-200 shadow-xl">
            {images.map(
              (img, key) =>
                activeTab === img.title && (
                  <Image
                    key={key}
                    src={img.src}
                    alt={img.alt}
                    width={1200}
                    height={800}
                  />
                )
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImageTabs;
