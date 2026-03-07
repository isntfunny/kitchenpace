import { fetchCategoriesForBar } from '@app/app/actions/category';
import {
    fetchChefSpotlight,
    fetchQuickTips,
    fetchRecentActivities,
    fetchTrendingTags,
} from '@app/app/actions/community';
import {
    fetchFeaturedRecipe,
    fetchNewestRecipes,
    fetchTopRatedRecipes,
} from '@app/app/actions/recipes';
import { ActivitySidebar } from '@app/components/features/ActivitySidebar';
import { CategoryBar } from '@app/components/features/CategoryBar';
import { ChefSpotlight } from '@app/components/features/ChefSpotlight';
import { Header } from '@app/components/features/Header';
import { QuickTips } from '@app/components/features/QuickTips';
import { RecipeScrollServer } from '@app/components/features/RecipeScrollServer';
import { TrendingTags } from '@app/components/features/TrendingTags';
import { AnimatedChefHat } from '@app/components/motion/AnimatedChefHat';
import { FadeInSection } from '@app/components/motion/FadeInSection';
import { DailyHighlight } from '@app/components/sections/DailyHighlight';
import { FitsNow } from '@app/components/sections/FitsNow';
import { FlowPillars } from '@app/components/sections/FlowPillars';
import { HeroSpotlight } from '@app/components/sections/HeroSpotlight';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

export const revalidate = 60;

export default async function Home() {
    const [
        featuredResult,
        newestResult,
        topRatedResult,
        trendingTagsResult,
        chefSpotlightResult,
        quickTipsResult,
        recentActivitiesResult,
        categoriesResult,
    ] = await Promise.allSettled([
        fetchFeaturedRecipe(),
        fetchNewestRecipes(),
        fetchTopRatedRecipes(),
        fetchTrendingTags(),
        fetchChefSpotlight(),
        fetchQuickTips(),
        fetchRecentActivities(),
        fetchCategoriesForBar(),
    ]);

    const handleSettled = <T,>(result: PromiseSettledResult<T>, fallback: T, label: string): T => {
        if (result.status === 'fulfilled') {
            return result.value;
        }

        console.error(`[Home] ${label} failed:`, result.reason);
        return fallback;
    };

    const featuredRecipe = handleSettled(featuredResult, null, 'fetchFeaturedRecipe');
    const newestRecipes = handleSettled(newestResult, [], 'fetchNewestRecipes');
    const topRatedRecipes = handleSettled(topRatedResult, [], 'fetchTopRatedRecipes');
    const trendingTags = handleSettled(trendingTagsResult, [], 'fetchTrendingTags');
    const chefSpotlight = handleSettled(chefSpotlightResult, null, 'fetchChefSpotlight');
    const quickTips = handleSettled(quickTipsResult, [], 'fetchQuickTips');
    const recentActivities = handleSettled(recentActivitiesResult, [], 'fetchRecentActivities');
    const categories = handleSettled(categoriesResult, [], 'fetchCategoriesForBar');

    return (
        <div
            className={css({
                minH: '100vh',
                color: 'text',
            })}
        >
            <Header />

            <main
                className={css({
                    maxW: '1400px',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                    py: { base: '4', md: '5' },
                })}
            >
                <HeroSpotlight />

                <FlowPillars />

                <div className={css({ mt: '4' })}>
                    <CategoryBar categories={categories} />
                </div>

                <div
                    className={css({
                        marginTop: '4',
                    })}
                >
                    <div
                        className={grid({
                            columns: { base: 1, lg: 12 },
                            gap: '4',
                        })}
                    >
                        <div className={css({ lg: { gridColumn: 'span 8' } })}>
                            <FadeInSection>
                                <DailyHighlight recipe={featuredRecipe} />
                            </FadeInSection>

                            <div
                                className={css({
                                    marginTop: '4',
                                })}
                            >
                                <RecipeScrollServer
                                    title="Neuste Rezepte"
                                    recipes={newestRecipes}
                                />
                            </div>

                            <div
                                className={css({
                                    marginTop: '4',
                                })}
                            >
                                <FitsNow />
                            </div>

                            <div
                                className={css({
                                    marginTop: '4',
                                })}
                            >
                                <RecipeScrollServer title="Top Rated" recipes={topRatedRecipes} />
                            </div>
                        </div>

                        <FadeInSection delay={0.1} className={css({ lg: { gridColumn: 'span 4' } })}>
                            <TrendingTags tags={trendingTags} />
                            <div
                                className={css({
                                    marginTop: '4',
                                })}
                            >
                                <ChefSpotlight chef={chefSpotlight} />
                            </div>
                            <div
                                className={css({
                                    marginTop: '4',
                                })}
                            >
                                <QuickTips tips={quickTips} />
                            </div>
                            <div
                                className={css({
                                    marginTop: '4',
                                })}
                            >
                                <ActivitySidebar activities={recentActivities} />
                            </div>
                        </FadeInSection>
                    </div>
                </div>
            </main>

            <footer
                className={css({
                    py: '5',
                    mt: '5',
                    textAlign: 'center',
                    fontFamily: 'body',
                    fontSize: 'sm',
                    color: 'muted',
                    background: 'surface.card',
                    boxShadow: 'shadow.medium',
                })}
            >
                <div
                    className={css({
                        maxWidth: '600px',
                        margin: '0 auto',
                        padding: '0 4',
                    })}
                >
                    <div
                        className={css({
                            fontSize: '2xl',
                            marginBottom: '3',
                            color: '#e07b53',
                        })}
                    >
                        <AnimatedChefHat />
                    </div>
                    <div
                        className={css({
                            fontWeight: '600',
                            color: 'text',
                            marginBottom: '2',
                        })}
                    >
                        KüchenTakt
                    </div>
                    <div>© 2026 KüchenTakt · Produkte mit Gefühl entdecken</div>
                </div>
            </footer>
        </div>
    );
}
