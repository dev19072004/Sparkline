const buildRequestedItemLabel = (category) => `${category.name} Brochure`;

export const resolveBrochureCategories = (navigation) => {
  const machineryCategory = navigation.find((entry) => entry.slug === "machinery");
  const childCategories = machineryCategory?.childCategories || [];

  return childCategories
    .filter((category) => category.brochureFileName)
    .map((category) => ({
      ...category,
      requestedItem: buildRequestedItemLabel(category)
    }));
};
