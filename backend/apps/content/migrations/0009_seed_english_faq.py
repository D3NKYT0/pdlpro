from uuid import UUID

from django.db import migrations


# English answers are concise by design; administrators can expand the detailed layer in the admin.
ENGLISH = [
    (1, "What is PDL 2.0?", "PDL 2.0 is the portal that brings together your account and community services.", "portal,dashboard,features"),
    (2, "How do I start using PDL?", "Create your portal account, verify your email, sign in, and open L2 Account to connect the game.", "register,sign up,getting started"),
    (3, "Where can I find server status, downloads, and information?", "Use the public Information, Downloads, Wiki, Calendar, and News pages.", "status,client,patch,download"),
    (4, "Why is a feature missing from my menu?", "Some modules may be disabled by the administration. Check announcements or contact support.", "missing,disabled,menu,unavailable"),
    (5, "How do I recover my portal password?", "Use Forgot password on the sign-in page and follow the link sent to your email.", "forgot password,reset,login"),
    (6, "How do I verify my email address?", "Open the verification link sent by PDL or request a new message, then check your spam folder.", "verify email,confirmation"),
    (7, "How do I protect my account?", "Use a unique password and enable two-factor authentication or a passkey in Account and security.", "2fa,passkey,security,authenticator"),
    (8, "Can I sign in with a social account?", "Social sign-in is shown when an identity provider has been enabled on the server.", "oauth,google,discord,social login"),
    (9, "Where do I change my profile and avatar?", "Open My profile in the dashboard.", "name,avatar,profile"),
    (10, "How do I create a game account?", "Open L2 Account and choose the option to register a game account.", "lineage,l2,game account,register"),
    (11, "How do I link an existing L2 account?", "Open L2 Account, choose Link account, and complete one of the available ownership checks.", "link account,existing account"),
    (12, "How do I change my L2 account password?", "Open L2 Account and use the password action for an account linked to you.", "lineage password,l2 password,game password"),
    (13, "Where can I see my characters?", "Your characters appear under their linked accounts on the L2 Account page.", "character,characters,char"),
    (14, "How do I use character services?", "Open the character and select an available service; review its requirements and cost first.", "nickname,gender,unstuck,service"),
    (15, "What is the difference between wallet balance, bonus, and tokens?", "They are separate balances with different purposes. Each operation shows which balance it uses.", "balance,coins,bonus,tokens"),
    (16, "How do I transfer balance to another player?", "Use Transfer in the Wallet and carefully confirm the recipient and amount.", "send coins,transfer,recipient"),
    (17, "How does exchange between the dashboard and the game work?", "Open Wallet and use Game exchange. Review the direction, rate, limits, and preview before confirming.", "exchange,adena,convert,pending"),
    (18, "How do I deposit or withdraw inventory items?", "Use Inventory to move eligible items between the dashboard bag and an eligible character.", "bag,deposit,withdraw,item,inventory"),
    (19, "Can I trade items with another player through the dashboard?", "Use the trade option in Inventory when the module is available.", "trade,send item,player"),
    (20, "How do I buy items or bundles from the Shop?", "Add products to the cart, review the order, and complete checkout.", "buy,cart,checkout,bundle,product"),
    (21, "How do I use a coupon?", "Enter the code in the cart and verify the discount before purchasing.", "coupon,promo code,discount"),
    (22, "How does the Marketplace work?", "The Marketplace lets you view and trade available listings according to server rules.", "market,buy character,sell character,listing"),
    (23, "How do auctions work?", "Open Auctions to review offers, manage your auctions, and place bids under the displayed rules.", "auction,bid,item"),
    (24, "Where can I track purchases and transactions?", "Open the history in the area where the operation was made.", "history,receipt,pending purchase,transaction"),
    (25, "Which games are available in the dashboard?", "The Games area contains the activities enabled by the administration.", "roulette,box,dice,slots,fishing,minigame"),
    (26, "How does fishing work?", "Choose a rod and bait in the Fishing tab. Bait is consumed when you cast.", "fish,bait,rod,collection"),
    (27, "How do I claim the daily bonus?", "Open Journey and rewards and claim the reward available for the current day.", "daily login,daily bonus,reward"),
    (28, "How do quests, passes, and rewards work?", "Track objectives and available claims in Journey and rewards.", "battle pass,quest,milestone,premium,reward"),
    (29, "Where can I see my progress and rankings?", "Use Progress in the dashboard and Rankings on the public website.", "level,xp,ranking,journey"),
    (30, "Where can I find news, events, guides, and the roadmap?", "Use the public News, Calendar, Wiki, and Roadmap pages.", "news,event,guide,wiki,roadmap"),
    (31, "How does the supporter program work?", "Open Supporters to review the program and submit an application for staff review.", "supporter,affiliate,commission,application"),
    (32, "How do I follow PDL announcements?", "Open Notifications in the dashboard and check public News.", "notification,push,announcement"),
    (33, "How do I open a support ticket?", "Open Support in the dashboard and describe the problem without including passwords or security codes.", "ticket,support,problem,bug"),
    (34, "Can Denkynho access my account or perform actions?", "No. Denkynho recognizes your session and only reads guidance authorized for your role.", "assistant,privacy,account,actions"),
    (35, "Where can I read the terms and privacy policy?", "Use the Terms, Privacy, and Agreement links on the public pages.", "privacy,data,terms,agreement"),
    (36, "How do I add funds to my wallet?", "Open Wallet and choose an available balance option. Review the currency, amount, and payment method.", "add funds,payment,wallet,coins"),
    (37, "What should I do when a payment is pending or fails?", "Check the order status in Wallet before trying again. Do not create duplicate charges.", "pending payment,failed,declined,order"),
    (38, "How do I unlink an L2 account or increase my slots?", "Use the available actions under L2 Account and review the consequences before confirming.", "unlink,slot,account limit"),
]

INTERNAL = [
    (1, "How does staff manage support tickets?", "Open the staff dashboard and use Support to view the queue allowed by your permissions.", "staff,support,ticket,queue"),
    (2, "Where does staff manage content and services?", "Use the staff dashboard; each administrative module appears according to your permissions.", "staff,admin,content,services,permission"),
    (3, "What security practices should staff follow?", "Use only the data required for the task and never request passwords or authentication codes.", "staff,privacy,security,credentials"),
    (4, "Where does a superadministrator manage dashboard themes?", "Open theme administration, which is available only to superadministrators.", "superadmin,theme,install,activate"),
]


def seed_english(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    for number, question, answer, keywords in ENGLISH:
        Faq.objects.filter(id=UUID(f"c0100000-0000-4000-8000-{number:012d}")).update(
            question_en=question, short_answer_en=answer, answer_en=answer, keywords_en=keywords
        )
    for number, question, answer, keywords in INTERNAL:
        Faq.objects.filter(id=UUID(f"c0200000-0000-4000-8000-{number:012d}")).update(
            question_en=question, short_answer_en=answer, answer_en=answer, keywords_en=keywords
        )


def remove_english(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    Faq.objects.filter(id__in=[UUID(f"c0100000-0000-4000-8000-{n:012d}") for n in range(1, 39)]).update(
        question_en="", short_answer_en="", answer_en="", keywords_en=""
    )
    Faq.objects.filter(id__in=[UUID(f"c0200000-0000-4000-8000-{n:012d}") for n in range(1, 5)]).update(
        question_en="", short_answer_en="", answer_en="", keywords_en=""
    )


class Migration(migrations.Migration):
    dependencies = [("content", "0008_faq_answer_en_faq_keywords_en_faq_question_en_and_more")]
    operations = [migrations.RunPython(seed_english, remove_english)]
