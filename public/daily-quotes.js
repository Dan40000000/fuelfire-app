// Curated fitness motivation quotes from athletes, coaches, and bodybuilders.
const dailyQuotes = [
    { quote: "The only bad workout is the one that didn't happen.", author: "Unknown" },
    { quote: "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success.", author: "Dwayne Johnson" },
    { quote: "The body achieves what the mind believes.", author: "Unknown" },
    { quote: "Don't wish for it, work for it.", author: "Unknown" },
    { quote: "Your health is an investment, not an expense.", author: "Unknown" },
    { quote: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
    { quote: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
    { quote: "You don't have to be extreme, just consistent.", author: "Unknown" },
    { quote: "The hardest lift is lifting your butt off the couch.", author: "Unknown" },
    { quote: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
    { quote: "A one-hour workout is only 4% of your day. No excuses.", author: "Unknown" },
    { quote: "The difference between try and triumph is a little umph.", author: "Unknown" },
    { quote: "If it doesn't challenge you, it won't change you.", author: "Fred DeVito" },
    { quote: "Strive for progress, not perfection.", author: "Unknown" },
    { quote: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
    { quote: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
    { quote: "Fall in love with taking care of yourself.", author: "Unknown" },
    { quote: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { quote: "The groundwork for all happiness is good health.", author: "Leigh Hunt" },
    { quote: "To enjoy the glow of good health, you must exercise.", author: "Gene Tunney" },
    { quote: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
    { quote: "You are stronger than you think.", author: "Unknown" },
    { quote: "Eat clean, train dirty.", author: "Unknown" },
    { quote: "Sweat is magic. Cover yourself in it daily to grant your wishes.", author: "Unknown" },
    { quote: "The only way to define your limits is by going beyond them.", author: "Arthur C. Clarke" },
    { quote: "Believe in yourself and all that you are.", author: "Christian D. Larson" },
    { quote: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
    { quote: "Whether you think you can or think you can't, you're right.", author: "Henry Ford" },
    { quote: "Strength doesn't come from what you can do. It comes from overcoming what you once thought you couldn't.", author: "Rikki Rogers" },
    { quote: "Dead last finish is greater than did not finish, which trumps did not start.", author: "Unknown" },
    { quote: "You are what you do, not what you say you'll do.", author: "Carl Jung" },
    { quote: "It's not about perfect. It's about effort.", author: "Jillian Michaels" },
    { quote: "Making excuses burns zero calories per hour.", author: "Unknown" },
    { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { quote: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
    { quote: "Training is like fighting with a gorilla. You don't stop when you're tired. You stop when the gorilla is tired.", author: "Greg Henderson" },
    { quote: "If you want something you've never had, you must be willing to do something you've never done.", author: "Thomas Jefferson" },
    { quote: "Rome wasn't built in a day, but they worked on it every single day.", author: "Unknown" },
    { quote: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { quote: "You don't find willpower, you create it.", author: "Unknown" },
    { quote: "The pain of discipline is better than the pain of regret.", author: "Unknown" },
    { quote: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
    { quote: "You can't spell challenge without change.", author: "Unknown" },
    { quote: "Discipline is doing what needs to be done, even when you don't want to do it.", author: "Unknown" },
    { quote: "Your limitation, it's only your imagination.", author: "Unknown" },
    { quote: "Great things never come from comfort zones.", author: "Unknown" },
    { quote: "Dream it. Wish it. Do it.", author: "Unknown" },
    { quote: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
    { quote: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
    { quote: "Dream bigger. Do bigger.", author: "Unknown" },
    { quote: "Don't wait for opportunity. Create it.", author: "Unknown" },
    { quote: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" },
    { quote: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
    { quote: "Dream it. Believe it. Build it.", author: "Unknown" },
    { quote: "A little progress each day adds up to big results.", author: "Satya Nani" },
    { quote: "Don't limit your challenges. Challenge your limits.", author: "Unknown" },
    { quote: "You don't need a new day to start over. You only need a new mindset.", author: "Hazel Hira Ozbek" },
    { quote: "Hustle until your haters ask if you're hiring.", author: "Unknown" },
    { quote: "The only time you should look back is to see how far you've come.", author: "Unknown" },
    { quote: "Excuses don't burn calories.", author: "Unknown" },
    { quote: "Do it for the people who want to see you fail.", author: "Unknown" },
    { quote: "You're only one workout away from a good mood.", author: "Unknown" },
    { quote: "The only person you should try to be better than is the person you were yesterday.", author: "Unknown" },
    { quote: "If you're tired of starting over, stop giving up.", author: "Unknown" },
    { quote: "The clock is ticking. Are you becoming the person you want to be?", author: "Greg Plitt" },
    { quote: "You can feel sore tomorrow or you can feel sorry tomorrow. You choose.", author: "Unknown" },
    { quote: "When you feel like quitting, think about why you started.", author: "Unknown" },
    { quote: "Sore today, strong tomorrow.", author: "Unknown" },
    { quote: "Go the extra mile. It's never crowded.", author: "Unknown" },
    { quote: "If you still look good at the end of your workout, you didn't train hard enough.", author: "Unknown" },
    { quote: "Today I will do what others won't, so tomorrow I can accomplish what others can't.", author: "Jerry Rice" },
    { quote: "Be stronger than your excuses.", author: "Unknown" },
    { quote: "Exercise should be regarded as a tribute to the heart.", author: "Gene Tunney" },
    { quote: "The resistance that you fight physically in the gym and the resistance that you fight in life can only build a strong character.", author: "Arnold Schwarzenegger" },
    { quote: "All progress takes place outside the comfort zone.", author: "Michael John Bobak" },
    { quote: "It's going to be a journey. It's not a sprint to get in shape.", author: "Kerri Walsh Jennings" },
    { quote: "The successful warrior is the average man with laser-like focus.", author: "Bruce Lee" },
    { quote: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
    { quote: "Once you are exercising regularly, the hardest thing is to stop it.", author: "Erin Gray" },
    { quote: "Most people fail, not because of lack of desire, but because of lack of commitment.", author: "Vince Lombardi" },
    { quote: "Champions keep playing until they get it right.", author: "Billie Jean King" },
    { quote: "I hated every minute of training, but I said, don't quit. Suffer now and live the rest of your life as a champion.", author: "Muhammad Ali" },
    { quote: "The fight is won or lost far away from witnesses, behind the lines, in the gym.", author: "Muhammad Ali" },
    { quote: "You have to think it before you can do it. The mind is what makes it all possible.", author: "Kai Greene" },
    { quote: "The last three or four reps is what makes the muscle grow.", author: "Arnold Schwarzenegger" },
    { quote: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon" },
    { quote: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
    { quote: "Take control of your consistent emotions and begin to consciously and deliberately reshape your daily experience.", author: "Tony Robbins" },
    { quote: "What seems impossible today will one day become your warm-up.", author: "Unknown" },
    { quote: "I don't count my sit-ups. I only start counting when it starts hurting.", author: "Muhammad Ali" },
    { quote: "Tough times don't last. Tough people do.", author: "Robert H. Schuller" },
    { quote: "A champion is someone who gets up when they can't.", author: "Jack Dempsey" },
    { quote: "Continuous effort, not strength or intelligence, is the key to unlocking our potential.", author: "Winston Churchill" },
    { quote: "It's not whether you get knocked down; it's whether you get up.", author: "Vince Lombardi" },
    { quote: "Things may come to those who wait, but only the things left by those who hustle.", author: "Abraham Lincoln" },
    { quote: "Nothing will work unless you do.", author: "Maya Angelou" },
    { quote: "The will to win means nothing without the will to prepare.", author: "Juma Ikangaa" },
    { quote: "If you don't make time for exercise, you'll probably have to make time for illness.", author: "Robin Sharma" },
    { quote: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
    { quote: "Today is your opportunity to build the tomorrow you want.", author: "Ken Poirot" },
    { quote: "You're going to have to let it hurt. Let it suck. The harder you work, the better you will look.", author: "Joe Manganiello" },
    { quote: "Winners train, losers complain.", author: "Unknown" },
    { quote: "You have to expect things of yourself before you can do them.", author: "Michael Jordan" },
    { quote: "The mind is the most important part of achieving any fitness goal. Mental change always comes before physical change.", author: "Matt McGorry" },
    { quote: "No matter how slow you go, you're still lapping everybody on the couch.", author: "Unknown" },
    { quote: "Fitness is not about being better than someone else. It's about being better than you used to be.", author: "Khloe Kardashian" },
    { quote: "Your health account, your bank account, they're the same thing. The more you put in, the more you can take out.", author: "Jack LaLanne" },
    { quote: "If you think lifting is dangerous, try being weak. Being weak is dangerous.", author: "Bret Contreras" },
    { quote: "Do not pray for an easy life, pray for the strength to endure a difficult one.", author: "Bruce Lee" },
    { quote: "Don't be afraid of failure. Be afraid of not trying.", author: "Michael Jordan" },
    { quote: "The body is your temple. Keep it pure and clean for the soul to reside in.", author: "B.K.S. Iyengar" },
    { quote: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
    { quote: "Strength is the product of struggle. You must do what others don't to achieve what others won't.", author: "Henry Rollins" },
    { quote: "Don't stop until you're proud.", author: "Unknown" },
    { quote: "Your diet is a bank account. Good food choices are good investments.", author: "Bethenny Frankel" },
    { quote: "Take care of your body. It's the only place you have to live in.", author: "Jim Rohn" },
    { quote: "Push yourself because no one else is going to do it for you.", author: "Unknown" },
    { quote: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
    { quote: "Run when you can, walk if you have to, crawl if you must; just never give up.", author: "Dean Karnazes" },
    { quote: "If you want to be a champion, you can't have any kind of outside negative force coming in to deflect you.", author: "Arnold Schwarzenegger" },
    { quote: "The real workout starts when you want to stop.", author: "Ronnie Coleman" },
    { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { quote: "To be a champion, you have to believe in yourself when nobody else will.", author: "Sugar Ray Robinson" },
    { quote: "If something stands between you and your success, move it. Never be denied.", author: "Dwayne Johnson" },
    { quote: "It never gets easier, you just get stronger.", author: "Unknown" },
    { quote: "Good things come to those who sweat.", author: "Unknown" },
    { quote: "Sometimes you just gotta work on yourself and be your own competition.", author: "Unknown" },
    { quote: "The difference between wanting and achieving is discipline.", author: "Unknown" },
    { quote: "Make yourself proud.", author: "Unknown" },
    { quote: "Stop doubting yourself, work hard, and make it happen.", author: "Unknown" },
    { quote: "Do it for yourself, not for anyone else.", author: "Unknown" },
    { quote: "You are your only limit.", author: "Unknown" },
    { quote: "Prove them wrong.", author: "Unknown" },
    { quote: "Fit is not a destination, it's a way of life.", author: "Unknown" },
    { quote: "Your life does not get better by chance, it gets better by change.", author: "Jim Rohn" },
    { quote: "Good, better, best. Never let it rest. Until your good is better and your better is best.", author: "Tim Duncan" },
    { quote: "You are capable of more than you know.", author: "Unknown" },
    { quote: "Doubt kills more dreams than failure ever will.", author: "Suzy Kassem" },
    { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { quote: "Make your body the sexiest outfit you own.", author: "Unknown" },
    { quote: "Working out is a reward, not a punishment.", author: "Unknown" },
    { quote: "The difference between the impossible and the possible lies in determination.", author: "Tommy Lasorda" },
    { quote: "Success is what comes after you stop making excuses.", author: "Luis Galarza" },
    { quote: "Someone busier than you is working out right now.", author: "Unknown" },
    { quote: "Pain is temporary. Quitting lasts forever.", author: "Lance Armstrong" },
    { quote: "You didn't come this far to only come this far.", author: "Unknown" },
    { quote: "The best project you'll ever work on is you.", author: "Unknown" },
    { quote: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
    { quote: "If you're going through hell, keep going.", author: "Winston Churchill" },
    { quote: "Every accomplishment starts with the decision to try.", author: "Unknown" },
    { quote: "A year from now you may wish you had started today.", author: "Karen Lamb" },
    { quote: "Be patient with yourself. Nothing in nature blooms all year.", author: "Unknown" },
    { quote: "Discipline is choosing between what you want now and what you want most.", author: "Unknown" },
    { quote: "Don't practice until you get it right. Practice until you can't get it wrong.", author: "Unknown" },
    { quote: "If it was easy, everyone would do it.", author: "Unknown" },
    { quote: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { quote: "The only bad decision is indecision.", author: "Unknown" },
    { quote: "You can't build a reputation on what you're going to do.", author: "Henry Ford" },
    { quote: "The only workout you'll regret is the one you didn't do.", author: "Unknown" },
    { quote: "Life begins at the end of your comfort zone.", author: "Neale Donald Walsch" },
    { quote: "I will beat yesterday's me.", author: "Unknown" },
    { quote: "The only easy day was yesterday.", author: "Navy SEALs" },
    { quote: "Do what you have to do until you can do what you want to do.", author: "Oprah Winfrey" },
    { quote: "You must expect great things of yourself before you can do them.", author: "Michael Jordan" },
    { quote: "Nothing worth having comes easy.", author: "Theodore Roosevelt" },
    { quote: "The pain will leave once it has finished teaching you.", author: "Bruce Lee" },
    { quote: "The only person who can pull me down is myself, and I'm not going to let myself pull me down anymore.", author: "C. JoyBell C." },
    { quote: "Don't measure yourself by what you have accomplished, but by what you should have accomplished with your ability.", author: "John Wooden" },
    { quote: "A winner is just a loser who tried one more time.", author: "George M. Moore Jr." },
    { quote: "The question isn't who is going to let me; it's who is going to stop me.", author: "Ayn Rand" },
    { quote: "If you always do what you've always done, you'll always get what you've always got.", author: "Henry Ford" },
    { quote: "All our dreams can come true if we have the courage to pursue them.", author: "Walt Disney" },
    { quote: "Your body is a reflection of your lifestyle.", author: "Unknown" },
    { quote: "Train insane or remain the same.", author: "Unknown" },
    { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { quote: "Results happen over time, not overnight. Work hard, stay consistent, and be patient.", author: "Unknown" },
    { quote: "Exercise is king. Nutrition is queen. Put them together and you've got a kingdom.", author: "Jack LaLanne" },
    { quote: "The only person you are competing against is yourself.", author: "Unknown" },
    { quote: "Strong people don't put others down. They lift them up.", author: "Michael P. Watson" },
    { quote: "I'm not telling you it's going to be easy, I'm telling you it's going to be worth it.", author: "Art Williams" },
    { quote: "Obsessed is just a word the lazy use to describe the dedicated.", author: "Russell Warren" },
    { quote: "Every rep counts. Every set counts. Every workout counts.", author: "Unknown" },
    { quote: "The body will not go where the mind has not been.", author: "Unknown" },
    { quote: "If you don't challenge yourself, you will never realize what you can become.", author: "Unknown" },
    { quote: "What hurts today makes you stronger tomorrow.", author: "Jay Cutler" },
    { quote: "Just believe in yourself. Even if you don't, pretend that you do and, at some point, you will.", author: "Venus Williams" },
    { quote: "Get comfortable being uncomfortable.", author: "Jillian Michaels" },
    { quote: "Look in the mirror. That's your competition.", author: "Unknown" },
    { quote: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
    { quote: "Do not let what you cannot do interfere with what you can do.", author: "John Wooden" },
    { quote: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
    { quote: "Your biggest challenge isn't someone else. It's the ache in your lungs and the burning in your legs.", author: "Unknown" },
    { quote: "Strength grows in the moments when you think you can't go on but you keep going anyway.", author: "Unknown" },
    { quote: "Slow progress is better than no progress.", author: "Unknown" },
    { quote: "Some people want it to happen, some wish it would happen, others make it happen.", author: "Michael Jordan" },
    { quote: "You're not going to get the butt you want by sitting on it.", author: "Unknown" },
    { quote: "Fitness is like a relationship. You can't cheat and expect it to work.", author: "Unknown" },
    { quote: "Don't downgrade your dream just to fit your reality. Upgrade your conviction to match your destiny.", author: "Unknown" },
    { quote: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
    { quote: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
    { quote: "The harder the battle, the sweeter the victory.", author: "Les Brown" },
    { quote: "Comfort is the enemy of achievement.", author: "Farrah Gray" },
    { quote: "I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.", author: "Bruce Lee" },
    { quote: "Suffer the pain of discipline or suffer the pain of regret.", author: "Unknown" },
    { quote: "I already know what giving up feels like. I want to see what happens if I don't.", author: "Neila Rey" },
    { quote: "Unless you puke, faint, or die, keep going.", author: "Jillian Michaels" },
    { quote: "A fit body, a calm mind, a house full of love. These things cannot be bought, they must be earned.", author: "Naval Ravikant" },
    { quote: "Motivation is crap. Motivation is easy and it's fleeting. Discipline is a lifestyle.", author: "Jocko Willink" },
    { quote: "Do not be afraid to fail. Be afraid not to try.", author: "Unknown" },
    { quote: "Your mind will quit a thousand times before your body ever does. Feel the fear and do it anyway.", author: "Unknown" },
    { quote: "Fitness is not a hobby, it's a lifestyle.", author: "Unknown" },
    { quote: "Champions aren't made in the gyms. Champions are made from something they have deep inside them.", author: "Muhammad Ali" },
    { quote: "Your current body is the only body that can take you to your new body, so be kind to it.", author: "Elaine Moran" },
    { quote: "We are what we repeatedly do. Excellence, then, is not an act but a habit.", author: "Aristotle" },
    { quote: "The only limit is the one you set yourself.", author: "Unknown" },
    { quote: "When you feel like stopping, think about why you started.", author: "Unknown" },
    { quote: "Challenges are what make life interesting. Overcoming them is what makes life meaningful.", author: "Joshua J. Marine" },
    { quote: "Physical fitness is not only one of the most important keys to a healthy body, it is the basis of dynamic and creative intellectual activity.", author: "John F. Kennedy" },
    { quote: "All progress begins outside your comfort zone.", author: "Unknown" },
    { quote: "I'm not lucky. I'm blessed. There's a difference.", author: "Unknown" },
    { quote: "Respect your body when it's asking for a break. Respect your body when it's asking for movement.", author: "Unknown" },
    { quote: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
    { quote: "Work hard in silence. Let success make the noise.", author: "Unknown" },
    { quote: "Fitness is a journey, not a destination.", author: "Unknown" },
    { quote: "The only bad workout is the one you skip.", author: "Unknown" },
    { quote: "It's a slow process, but quitting won't speed it up.", author: "Unknown" },
    { quote: "Being defeated is often a temporary condition. Giving up is what makes it permanent.", author: "Marilyn vos Savant" },
    { quote: "You will never always be motivated. You have to learn to be disciplined.", author: "Unknown" },
    { quote: "Sweat is just fat crying.", author: "Unknown" },
    { quote: "Don't say you don't have enough time. You have exactly the same number of hours per day that were given to Helen Keller and Albert Einstein.", author: "H. Jackson Brown Jr." },
    { quote: "When you feel like giving up, remember why you held on for so long in the first place.", author: "Unknown" },
    { quote: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
    { quote: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
    { quote: "Every champion was once a contender that refused to give up.", author: "Rocky Balboa" },
    { quote: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
    { quote: "Pain is weakness leaving the body.", author: "U.S. Marines" },
    { quote: "Become addicted to constant and never-ending self improvement.", author: "Anthony J. D'Angelo" },
    { quote: "You can have results or excuses. Not both.", author: "Arnold Schwarzenegger" },
    { quote: "Don't limit your challenges, challenge your limits.", author: "Unknown" },
    { quote: "When you hit failure, your workout has just begun.", author: "Ronnie Coleman" },
    { quote: "Exercise not only changes your body, it changes your mind, your attitude, and your mood.", author: "Unknown" },
    { quote: "If you're persistent, you will get it. If you're consistent, you will keep it.", author: "Unknown" },
    { quote: "I don't stop when I'm tired. I stop when I'm done.", author: "David Goggins" },
    { quote: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { quote: "Never give up on a dream just because of the time it will take to accomplish it. The time will pass anyway.", author: "Earl Nightingale" },
    { quote: "A person who conquers himself is greater than one who conquers a thousand men in battle.", author: "Buddha" },
    { quote: "The best way to predict the future is to create it.", author: "Abraham Lincoln" },
    { quote: "Training gives us an outlet for suppressed energies created by stress.", author: "Arnold Schwarzenegger" },
    { quote: "Do what is right, not what is easy.", author: "Unknown" },
    { quote: "If you can't fly, then run. If you can't run, then walk. If you can't walk, then crawl. But whatever you do, keep moving forward.", author: "Martin Luther King Jr." },
    { quote: "The mind is the limit. As long as the mind believes you can do something, you can do it.", author: "Arnold Schwarzenegger" },
    { quote: "Action is the real measure of intelligence.", author: "Napoleon Hill" },
    { quote: "You may have to fight a battle more than once to win it.", author: "Margaret Thatcher" },
    { quote: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
    { quote: "Consistency is what transforms average into excellence.", author: "Unknown" },
    { quote: "Most of the important things in the world have been accomplished by people who kept on trying when there seemed to be no hope at all.", author: "Dale Carnegie" },
    { quote: "We cannot become what we want by remaining what we are.", author: "Max DePree" },
    { quote: "Age is whatever you think it is. You are as old as you think you are.", author: "Muhammad Ali" },
    { quote: "Don't be upset by the results you didn't get with the work you didn't do.", author: "Unknown" },
    { quote: "Failure is simply the opportunity to begin again, this time more intelligently.", author: "Henry Ford" },
    { quote: "It's not the load that breaks you down, it's the way you carry it.", author: "Lou Holtz" },
    { quote: "Your goals don't care how you feel.", author: "Unknown" },
    { quote: "Make muscles, not excuses.", author: "Unknown" },
    { quote: "The only thing standing between you and your goal is the story you keep telling yourself.", author: "Jordan Belfort" },
    { quote: "Either you run the day, or the day runs you.", author: "Jim Rohn" },
    { quote: "Do it now. Sometimes later becomes never.", author: "Unknown" },
    { quote: "Excellence is not a destination; it is a continuous journey that never ends.", author: "Brian Tracy" },
    { quote: "You don't get what you wish for. You get what you work for.", author: "Unknown" },
    { quote: "Knowledge is knowing what to do. Wisdom is doing it.", author: "Unknown" },
    { quote: "Take the first step in faith. You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr." },
    { quote: "Change your thoughts and you change your world.", author: "Norman Vincent Peale" },
    { quote: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
    { quote: "There are seven days in the week and someday isn't one of them.", author: "Unknown" },
    { quote: "Make it happen. Shock everyone.", author: "Unknown" },
    { quote: "Stop wishing. Start doing.", author: "Unknown" },
    { quote: "The best revenge is massive success.", author: "Frank Sinatra" },
    { quote: "The starting point of all achievement is desire.", author: "Napoleon Hill" },
    { quote: "Strength and growth come only through continuous effort and struggle.", author: "Napoleon Hill" },
    { quote: "Hard work beats talent when talent fails to work hard.", author: "Kevin Durant" },
    { quote: "Your current safe boundaries were once unknown frontiers.", author: "Unknown" },
    { quote: "The temptation to quit will be greatest just before you are about to succeed.", author: "Chinese Proverb" },
    { quote: "Don't wish it were easier. Wish you were better.", author: "Jim Rohn" },
    { quote: "You can't out-exercise a bad diet.", author: "Unknown" },
    { quote: "The human body is the best picture of the human soul.", author: "Ludwig Wittgenstein" },
    { quote: "Believe in yourself, push your limits, experience life, conquer your goals, and be happy.", author: "Joel Brown" },
    { quote: "Nobody who ever gave their best regretted it.", author: "George S. Halas" },
    { quote: "Success is getting what you want. Happiness is wanting what you get.", author: "Dale Carnegie" },
    { quote: "In the midst of chaos, there is also opportunity.", author: "Sun Tzu" },
    { quote: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupery" },
    { quote: "Ability is what you're capable of doing. Motivation determines what you do. Attitude determines how well you do it.", author: "Lou Holtz" },
    { quote: "Work until your idols become your rivals.", author: "Unknown" },
    { quote: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey" },
    { quote: "Act as if what you do makes a difference. It does.", author: "William James" },
    { quote: "Success is not how high you have climbed, but how you make a positive difference to the world.", author: "Roy T. Bennett" },
    { quote: "Doing the best at this moment puts you in the best place for the next moment.", author: "Oprah Winfrey" },
    { quote: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
    { quote: "Set your goals high, and don't stop till you get there.", author: "Bo Jackson" },
    { quote: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
    { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { quote: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
    { quote: "Discipline equals freedom.", author: "Jocko Willink" },
    { quote: "You can either suffer the pain of discipline or the pain of regret.", author: "Jim Rohn" },
    { quote: "You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr." },
    { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { quote: "If you fail to prepare, you prepare to fail.", author: "Mark Spitz" },
    { quote: "My attitude is that if you push me toward a weakness, I will turn that weakness into a strength.", author: "Michael Jordan" },
    { quote: "If you train hard, you'll not only be hard, you'll be hard to beat.", author: "Herschel Walker" },
    { quote: "Champions do not become champions when they win the event, but in the hours, weeks, months, and years they spend preparing for it.", author: "Alan Armstrong" },
    { quote: "Training is everything. The peach was once a bitter almond.", author: "Mark Twain" },
    { quote: "The difference between the impossible and the possible lies in a person's determination.", author: "Tommy Lasorda" },
    { quote: "A champion is built of blood, sweat, and respect. One day you'll feast on victory, but every day you must wake up hungry for more.", author: "Muhammad Ali" },
    { quote: "If it's important to you, you'll find a way. If not, you'll find an excuse.", author: "Ryan Blair" },
    { quote: "If you want to change your body, you must first change your mind.", author: "Unknown" },
    { quote: "Good things come to those who sweat.", author: "Unknown" },
    { quote: "Success is usually the culmination of controlling failure.", author: "Sylvester Stallone" },
    { quote: "You have to be at your strongest when you're feeling at your weakest.", author: "Unknown" },
    { quote: "I train to be the best in the world on my worst day.", author: "Ronda Rousey" },
    { quote: "Don't count the days, make the days count.", author: "Muhammad Ali" },
    { quote: "If you do not conquer self, you will be conquered by self.", author: "Napoleon Hill" },
    { quote: "There are no shortcuts to any place worth going.", author: "Beverly Sills" },
    { quote: "If you aren't going all the way, why go at all?", author: "Joe Namath" },
    { quote: "The difference between a goal and a dream is a deadline.", author: "Steve Smith" },
    { quote: "Somewhere behind the athlete you've become is the little kid who fell in love with the game.", author: "Mia Hamm" },
    { quote: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
    { quote: "The more you sweat in training, the less you bleed in battle.", author: "Navy SEALs" },
    { quote: "If you don't find time, if you don't do the work, you don't get the results.", author: "Arnold Schwarzenegger" },
    { quote: "If you ever lack the motivation to train, then think what happens to your mind and body when you don't.", author: "Shifu Yan Lei" },
    { quote: "Strength does not come from winning. Your struggles develop your strengths.", author: "Arnold Schwarzenegger" },
    { quote: "Your speed doesn't matter. Forward is forward.", author: "Unknown" },
    { quote: "A little progress each day adds up to big results.", author: "Unknown" },
    { quote: "If it doesn't challenge you, it won't change you.", author: "Fred DeVito" },
    { quote: "Success in anything will always come down to this: focus and effort, and we control both.", author: "Dwayne Johnson" },
    { quote: "The best training program in the world is the one you will follow.", author: "Unknown" },
    { quote: "To uncover your true potential, you must first find your own limits and then have the courage to blow past them.", author: "Picabo Street" },
    { quote: "Strength is a matter of a made-up mind.", author: "John Beecher" },
    { quote: "Don't be afraid of failure. This is the way to succeed.", author: "LeBron James" },
    { quote: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
    { quote: "When you push your body beyond what you thought it could do, you return home with a new frame of reference.", author: "Courtney Prather" },
    { quote: "A goal is a dream with a deadline.", author: "Napoleon Hill" },
    { quote: "You don't drown by falling in the water. You drown by staying there.", author: "Ed Cole" },
    { quote: "You have the power to change your life right now. Do not wait.", author: "Unknown" },
    { quote: "Every day is another chance to get stronger.", author: "Unknown" },
    { quote: "Strength does not come from what you can do. It comes from overcoming the things you once thought you couldn't.", author: "Rikki Rogers" },
    { quote: "If your dreams do not scare you, they are not big enough.", author: "Muhammad Ali" },
    { quote: "If you want to find the real competition, look in the mirror.", author: "Rich Froning Jr." },
    { quote: "Do something today that your future self will thank you for.", author: "Unknown" },
    { quote: "Take pride in how far you have come and have faith in how far you can go.", author: "Christian Larson" },
    { quote: "You can't always be the best. You can always do your best.", author: "Unknown" },
    { quote: "Obsessed is a word the lazy use to describe the dedicated.", author: "Unknown" },
    { quote: "If you want to live a happy life, tie it to a goal, not to people or things.", author: "Albert Einstein" },
    { quote: "You can have results or excuses, not both.", author: "Unknown" },
    { quote: "If you still look cute after the gym, you didn't work hard enough.", author: "Unknown" },
    { quote: "You must do things you think you cannot do.", author: "Eleanor Roosevelt" },
    { quote: "I always believed that the real competition is with yourself.", author: "Billy Mills" },
    { quote: "I don't want to be one of the greatest. I want to be the greatest.", author: "Kid Rock" },
    { quote: "Winning is not everything, but wanting to win is.", author: "Vince Lombardi" },
    { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { quote: "Whether you think you can or think you can't, you're right.", author: "Henry Ford" },
    { quote: "The real glory is being knocked to your knees and then coming back.", author: "Vince Lombardi" },
    { quote: "Champions keep playing until they get it right.", author: "Billie Jean King" },
    { quote: "Success comes to those who work the hardest and who never quit.", author: "Will Smith" },
    { quote: "A dream does not become reality through magic; it takes sweat, determination, and hard work.", author: "Colin Powell" },
    { quote: "Your mind is the strongest body part you have. Use it wisely.", author: "Unknown" },
    { quote: "Some people want it to happen, some wish it would happen, others make it happen.", author: "Michael Jordan" },
    { quote: "The difference between the impossible and the possible lies in determination.", author: "Usain Bolt" },
    { quote: "Set your goals, then demolish them.", author: "Unknown" },
    { quote: "Fitness is like marriage. You can't cheat on it and expect it to work.", author: "Bonnie Pfiester" },
    { quote: "The true measure of a man is how he treats someone who can do him absolutely no good.", author: "Samuel Johnson" },
    { quote: "It takes 4 weeks for you to notice, 8 weeks for your friends to notice, and 12 weeks for the world to notice.", author: "Unknown" },
    { quote: "I never worry about the problem. I worry about the solution.", author: "Shaquille O'Neal" },
    { quote: "My goal is not to be better than anyone else, but to be better than I used to be.", author: "Unknown" },
    { quote: "Success is not owned. It's leased. And rent is due every day.", author: "J.J. Watt" },
    { quote: "Some people hate training, but I love it.", author: "David Goggins" },
    { quote: "The real purpose of running isn't to win a race, it's to test the limits of the human heart.", author: "Bill Bowerman" },
    { quote: "Life is too short to waste on hating others, so train hard and love the grind.", author: "Unknown" },
    { quote: "My power is in my compounding effort and compounding focus.", author: "Tom Brady" },
    { quote: "Your body hears everything your mind says.", author: "Unknown" },
    { quote: "Once you learn to quit, it becomes a habit.", author: "Vince Lombardi Jr." },
    { quote: "Success is liking yourself, liking what you do, and liking how you do it.", author: "Maya Angelou" },
    { quote: "I look in the mirror and see a champion. That's what I see.", author: "Nate Robinson" },
    { quote: "If it's not hard, you're not doing it right.", author: "Unknown" },
    { quote: "I can. I will. End of story.", author: "Unknown" }
];

const QUOTE_ENGINE_BUILD = "2025-11-04T01:55:00Z";
const DECK_KEY = "dailyQuoteDeckV2";
const LAST_QUOTE_KEY = "dailyQuoteLastV2";

function safeGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn("[DailyQuote] localStorage get failed:", error);
        return null;
    }
}

function safeSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn("[DailyQuote] localStorage set failed:", error);
    }
}

function parseStoredJson(raw, fallback) {
    if (!raw) {
        return fallback;
    }
    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn("[DailyQuote] Failed to parse stored JSON:", error);
        return fallback;
    }
}

function secureRandomInt(maxExclusive) {
    if (maxExclusive <= 0) {
        return 0;
    }
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return array[0] % maxExclusive;
    }
    return Math.floor(Math.random() * maxExclusive);
}

function shuffleIndices(total) {
    const indices = Array.from({ length: total }, (_, idx) => idx);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = secureRandomInt(i + 1);
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
    }
    return indices;
}

function loadDeck() {
    return parseStoredJson(safeGet(DECK_KEY), []);
}

function saveDeck(deck) {
    safeSet(DECK_KEY, JSON.stringify(deck));
}

function createDeck() {
    if (!dailyQuotes.length) {
        return [];
    }
    const deck = shuffleIndices(dailyQuotes.length);
    const lastIndexRaw = safeGet(LAST_QUOTE_KEY);
    const lastIndex = lastIndexRaw !== null ? Number(lastIndexRaw) : null;
    if (Number.isInteger(lastIndex) && deck.length > 1) {
        const topIndex = deck[deck.length - 1];
        if (topIndex === lastIndex) {
            const swapIdx = secureRandomInt(deck.length - 1);
            const tmp = deck[swapIdx];
            deck[swapIdx] = deck[deck.length - 1];
            deck[deck.length - 1] = tmp;
        }
    }
    return deck;
}

function drawNextQuote() {
    if (!dailyQuotes.length) {
        return null;
    }

    let deck = loadDeck();
    if (!Array.isArray(deck) || deck.length === 0) {
        deck = createDeck();
    }

    if (!Array.isArray(deck) || deck.length === 0) {
        console.warn("[DailyQuote] Deck creation failed. Falling back to first quote.");
        safeSet(LAST_QUOTE_KEY, "0");
        saveDeck([]);
        return { index: 0, remaining: 0, data: dailyQuotes[0] };
    }

    const nextIndex = deck.pop();
    if (!Number.isInteger(nextIndex) || !dailyQuotes[nextIndex]) {
        console.warn("[DailyQuote] Invalid quote index encountered. Resetting deck.");
        deck = createDeck();
        if (!deck.length) {
            return { index: 0, remaining: 0, data: dailyQuotes[0] };
        }
        const recoveredIndex = deck.pop();
        saveDeck(deck);
        safeSet(LAST_QUOTE_KEY, String(recoveredIndex));
        return {
            index: recoveredIndex,
            remaining: deck.length,
            data: dailyQuotes[recoveredIndex]
        };
    }

    saveDeck(deck);
    safeSet(LAST_QUOTE_KEY, String(nextIndex));
    return {
        index: nextIndex,
        remaining: deck.length,
        data: dailyQuotes[nextIndex]
    };
}

function renderQuote(quotePayload) {
    const banner = document.getElementById("quote-banner");
    const quoteTextEl = document.getElementById("daily-quote");
    const quoteAuthorEl = document.getElementById("quote-author");

    if (!banner || !quoteTextEl) {
        return;
    }

    if (!quotePayload || !quotePayload.data || !quotePayload.data.quote) {
        quoteTextEl.textContent = '"Keep pushing. You have got this."';
        if (quoteAuthorEl) {
            quoteAuthorEl.textContent = "- FuelFire";
        }
        return;
    }

    const { data, index, remaining } = quotePayload;
    quoteTextEl.textContent = `"${data.quote}"`;
    if (quoteAuthorEl) {
        quoteAuthorEl.textContent = data.author ? `- ${data.author}` : "- Unknown";
    }

    if (typeof index === "number") {
        console.info(`[DailyQuote] Showing quote ${index + 1}/${dailyQuotes.length} (remaining ${remaining})`);
    }
}

function displayNextQuote() {
    renderQuote(drawNextQuote());
}

function refreshQuote(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    displayNextQuote();
}

function closeQuoteBanner(event) {
    if (event) {
        event.stopPropagation();
    }
    const banner = document.getElementById("quote-banner");
    if (banner) {
        banner.style.display = "none";
    }
}

function initDailyQuote() {
    const banner = document.getElementById("quote-banner");
    if (!banner) {
        return;
    }

    banner.style.display = "block";
    displayNextQuote();

    const shuffleBtn = document.getElementById("quote-shuffle");
    if (shuffleBtn && !shuffleBtn._hasQuoteListener) {
        shuffleBtn.addEventListener("click", refreshQuote);
        shuffleBtn._hasQuoteListener = true;
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDailyQuote);
} else {
    initDailyQuote();
}

window.refreshQuote = refreshQuote;
window.closeQuoteBanner = closeQuoteBanner;
